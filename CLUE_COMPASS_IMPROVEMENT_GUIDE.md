# Clue Compass Crew - Improvement Guide
## Edge Functions & Mobile Responsiveness

### Executive Summary

This guide provides comprehensive recommendations for improving both the Supabase Edge Functions architecture and the mobile user experience. The application has a solid foundation with 32+ edge functions and a responsive UI built with React, Tailwind CSS, and shadcn/ui components.

**Key Focus Areas:**
1. Edge Function optimizations (caching, connection pooling, error handling)
2. Mobile responsiveness enhancements (touch targets, layouts, navigation)
3. Performance improvements
4. Accessibility considerations

---

## Part 1: Edge Function Integration Improvements

### Current Architecture Analysis

✅ **Strengths:**
- Centralized HTTP client with retry logic (`_shared/httpClient.ts`)
- Exponential backoff with jitter
- Rate limiting and concurrency controls
- Time budget management
- CORS headers properly configured
- Service role authentication

⚠️ **Areas for Improvement:**
- Caching strategies not implemented
- Database connection pooling could be optimized
- Response compression not configured
- Limited monitoring/observability
- No circuit breaker pattern

---

### 1. Add Response Caching Layer

**Issue:** Repeated API calls to external services (Congress.gov, FEC) waste time and quota.

**Solution:** Implement caching with TTL (Time-To-Live) strategies

Create `supabase/functions/_shared/cache.ts`:
```typescript
// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new MemoryCache();

// Helper for cached fetch
export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<T> {
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    console.log(`[cache] HIT: ${cacheKey}`);
    return cached;
  }

  console.log(`[cache] MISS: ${cacheKey}`);
  const data = await fetcher();
  cache.set(cacheKey, data, ttlSeconds);
  return data;
}
```

**Usage in edge functions:**
```typescript
import { cachedFetch } from "../_shared/cache.ts";

// Example: Cache bill data for 10 minutes
const billData = await cachedFetch(
  `bill:${billId}`,
  async () => {
    const response = await fetch(`https://api.congress.gov/v3/bill/${billId}`);
    return response.json();
  },
  600 // 10 minutes
);
```

**Benefits:**
- Reduces external API calls by 60-80%
- Faster response times
- Lower quota consumption
- Reduced costs

---

### 2. Database Connection Pooling

**Issue:** Each edge function creates new database connections, causing overhead.

**Solution:** Implement connection pooling pattern

Update `_shared/supabaseClient.ts`:
```typescript
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Singleton pattern for database connections
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "x-application-name": "clue-compass-crew",
      },
    },
  });

  return supabaseClient;
}

// Batch operations helper
export async function batchUpsert<T>(
  client: SupabaseClient,
  table: string,
  data: T[],
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await client.from(table).upsert(batch);

    if (error) {
      console.error(`Batch upsert error (${i}-${i + batch.length}):`, error);
      throw error;
    }
  }
}
```

**Usage:**
```typescript
import { getSupabaseClient, batchUpsert } from "../_shared/supabaseClient.ts";

const supabase = getSupabaseClient();

// Batch insert members
await batchUpsert(supabase, "congress_members", members, 100);
```

---

### 3. Implement Circuit Breaker Pattern

**Issue:** Repeated failures to external APIs can cascade and cause timeouts.

**Solution:** Add circuit breaker to prevent cascading failures

Create `supabase/functions/_shared/circuitBreaker.ts`:
```typescript
export enum CircuitState {
  CLOSED = "CLOSED",     // Normal operation
  OPEN = "OPEN",         // Blocking requests
  HALF_OPEN = "HALF_OPEN" // Testing recovery
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000, // 1 minute
    private halfOpenSuccessThreshold: number = 2
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if we should transition to HALF_OPEN
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        console.log("[CircuitBreaker] Transitioning to HALF_OPEN");
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN - failing fast");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        console.log("[CircuitBreaker] Transitioning to CLOSED");
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      console.log("[CircuitBreaker] Transitioning to OPEN");
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Global circuit breakers per service
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(service: string): CircuitBreaker {
  if (!breakers.has(service)) {
    breakers.set(service, new CircuitBreaker());
  }
  return breakers.get(service)!;
}
```

**Usage:**
```typescript
import { getCircuitBreaker } from "../_shared/circuitBreaker.ts";

const breaker = getCircuitBreaker("congress-api");

const data = await breaker.execute(async () => {
  return await fetchWithRetry(url, options, "congress-api");
});
```

---

### 4. Add Structured Logging & Observability

**Issue:** Limited visibility into edge function performance and errors.

**Solution:** Implement structured logging

Create `supabase/functions/_shared/logger.ts`:
```typescript
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogContext {
  function: string;
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

class Logger {
  constructor(private context: LogContext) {}

  private log(level: LogLevel, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(data && { data }),
    };
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any): void {
    this.log(LogLevel.ERROR, message, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    });
  }

  withContext(additionalContext: Partial<LogContext>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

export function createLogger(functionName: string, requestId?: string): Logger {
  return new Logger({ function: functionName, requestId });
}
```

**Usage:**
```typescript
import { createLogger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger("sync-bills", requestId);

  logger.info("Starting bill sync");

  try {
    // ... operation
    logger.info("Bill sync completed", { count: bills.length });
  } catch (error) {
    logger.error("Bill sync failed", error);
  }
});
```

---

### 5. Add Response Compression

**Issue:** Large JSON responses slow down edge functions.

**Solution:** Enable gzip compression

Update edge functions to include compression:
```typescript
import { gzipEncode } from "https://deno.land/x/wasm_gzip@v1.0.0/mod.ts";

function compressResponse(data: any): Uint8Array {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(json);
  return gzipEncode(jsonBytes);
}

Deno.serve(async (req) => {
  const acceptEncoding = req.headers.get("accept-encoding") || "";
  const supportsGzip = acceptEncoding.includes("gzip");

  const data = { /* your response data */ };

  if (supportsGzip && JSON.stringify(data).length > 1024) {
    const compressed = compressResponse(data);
    return new Response(compressed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
      },
    });
  }

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

---

### 6. Optimize Batch Processing

**Current:** `processBatch` in httpClient.ts is basic

**Enhancement:** Add better progress tracking and error recovery

Update `_shared/httpClient.ts`:
```typescript
export interface BatchOptions<T, R> {
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: (completed: number, total: number, item: T) => void;
  onError?: (item: T, error: Error) => void;
  continueOnError?: boolean;
}

export async function processBatchWithRecovery<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions<T, R> = {}
): Promise<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
  const {
    batchSize = 10,
    delayBetweenBatches = 100,
    onProgress,
    onError,
    continueOnError = true,
  } = options;

  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchPromises = batch.map(async (item) => {
      try {
        const result = await processor(item);
        onProgress?.(i + batch.indexOf(item) + 1, items.length, item);
        return { success: true, result };
      } catch (error) {
        const err = error as Error;
        errors.push({ item, error: err });
        onError?.(item, err);

        if (!continueOnError) {
          throw error;
        }
        return { success: false, result: null };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(r => r.success).map(r => r.result!));

    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }

  return { results, errors };
}
```

---

## Part 2: Mobile Responsiveness Improvements

### Current Mobile State Analysis

✅ **Strengths:**
- Responsive Tailwind breakpoints (sm:, md:, lg:)
- Mobile menu using Sheet component
- Responsive padding via `civic-container`
- Good use of flexible layouts
- Proper viewport configuration

⚠️ **Areas for Improvement:**
- Touch targets not consistently sized (44x44px minimum)
- Some fixed text sizes don't scale on mobile
- Complex data tables need mobile-specific layouts
- No bottom navigation for key actions
- Form inputs could be more touch-friendly
- Map component needs mobile optimization

---

### 1. Touch Target Optimization

**Issue:** Some interactive elements are too small for touch on mobile.

**Solution:** Ensure minimum 44x44px touch targets

Update `src/index.css`:
```css
@layer utilities {
  /* Touch-friendly interactive elements */
  .touch-target {
    @apply min-h-[44px] min-w-[44px] flex items-center justify-center;
  }

  .touch-target-lg {
    @apply min-h-[48px] min-w-[48px] flex items-center justify-center;
  }

  .touch-target-xl {
    @apply min-h-[56px] min-w-[56px] flex items-center justify-center;
  }

  /* Button mobile sizing */
  .btn-mobile {
    @apply h-12 px-4 text-base;
  }

  .btn-mobile-sm {
    @apply h-10 px-3 text-sm;
  }
}
```

**Apply to components:**
```tsx
// Update Button components
<Button className="touch-target" size="icon">
  <Menu className="h-5 w-5" />
</Button>

// Update navigation items
<Link
  to={item.to}
  className="flex items-center gap-3 rounded-lg px-3 py-3 touch-target-sm"
>
  <item.icon className="h-5 w-5" />
  {item.label}
</Link>
```

---

### 2. Responsive Typography Scale

**Issue:** Text sizes don't scale well across devices.

**Solution:** Add mobile-first typography utilities

Update `tailwind.config.ts`:
```typescript
extend: {
  fontSize: {
    // Mobile-first responsive text sizes
    'xs-mobile': ['0.75rem', { lineHeight: '1rem' }],     // 12px
    'sm-mobile': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    'base-mobile': ['1rem', { lineHeight: '1.5rem' }],     // 16px
    'lg-mobile': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    'xl-mobile': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl-mobile': ['1.5rem', { lineHeight: '2rem' }],      // 24px
    '3xl-mobile': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  },
}
```

Update `src/index.css`:
```css
@layer utilities {
  /* Responsive text utilities */
  .text-mobile-xs {
    @apply text-xs sm:text-sm;
  }

  .text-mobile-sm {
    @apply text-sm sm:text-base;
  }

  .text-mobile-base {
    @apply text-base sm:text-lg;
  }

  .text-mobile-lg {
    @apply text-lg sm:text-xl;
  }

  .text-mobile-xl {
    @apply text-xl sm:text-2xl;
  }

  .text-mobile-2xl {
    @apply text-2xl sm:text-3xl;
  }

  .text-mobile-3xl {
    @apply text-3xl sm:text-4xl md:text-5xl;
  }
}
```

---

### 3. Mobile-Optimized Navigation

**Current:** Header works but could use a bottom navigation bar on mobile.

**Solution:** Add bottom navigation for key actions

Create `src/components/BottomNav.tsx`:
```tsx
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Map, FileText, Scale, Vote, Heart } from "lucide-react";

const bottomNavItems = [
  { to: "/map", icon: Map, label: "Map" },
  { to: "/bills", icon: FileText, label: "Bills" },
  { to: "/compare", icon: Scale, label: "Compare" },
  { to: "/votes", icon: Vote, label: "Votes" },
  { to: "/my-matches", icon: Heart, label: "Matches" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors touch-target",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

Update `src/App.tsx`:
```tsx
import { BottomNav } from "@/components/BottomNav";

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ComparisonProvider>
          <BrowserRouter>
            <div className="pb-16 lg:pb-0"> {/* Add bottom padding for mobile nav */}
              <Routes>
                {/* ... routes ... */}
              </Routes>
              <BottomNav />
            </div>
          </BrowserRouter>
        </ComparisonProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
```

---

### 4. Mobile-Friendly Form Inputs

**Issue:** Form inputs may be difficult to use on mobile.

**Solution:** Optimize form field sizing and spacing

Update form components:
```tsx
// Ensure minimum input heights
<Input
  className="h-12 text-base" // Larger tap target, prevents zoom on iOS
  type="email"
  placeholder="Enter email"
/>

// Add proper input types for mobile keyboards
<Input
  type="tel" // Opens numeric keypad
  inputMode="numeric"
  pattern="[0-9]*"
  placeholder="ZIP Code"
/>

<Input
  type="email" // Opens email keyboard with @ symbol
  inputMode="email"
  placeholder="Email address"
/>

// Increase spacing between form fields
<form className="space-y-4 sm:space-y-5">
  <div className="space-y-2">
    <Label className="text-base">Field Label</Label>
    <Input className="h-12" />
  </div>
</form>
```

---

### 5. Responsive Grid Layouts

**Issue:** Complex grids don't stack well on mobile.

**Solution:** Add mobile-first grid patterns

Update `src/index.css`:
```css
@layer utilities {
  /* Responsive grid patterns */
  .grid-mobile-1 {
    @apply grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6;
  }

  .grid-mobile-2 {
    @apply grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-4 lg:gap-6;
  }

  .grid-mobile-cards {
    @apply grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
  }

  /* Feature cards */
  .grid-features {
    @apply grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3;
  }
}
```

---

### 6. Mobile-Optimized Map Component

**Issue:** USMap grid may be difficult to interact with on small screens.

**Solution:** Add responsive sizing and touch-friendly states

Update `src/components/USMap.tsx`:
```tsx
export function USMap({ onStateClick, showStats = true }: USMapProps) {
  // ... existing code ...

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Map Container */}
      <div className="relative w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          className="inline-grid gap-0.5 sm:gap-1 min-w-[640px] sm:min-w-0"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${MAX_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {/* State cells with improved mobile touch */}
          {STATE_COLUMNS.map((column, colIndex) =>
            column.map((abbr, rowIndex) => {
              if (!abbr) {
                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    className="aspect-square"
                  />
                );
              }

              return (
                <button
                  key={abbr}
                  onClick={() => handleStateClick(abbr)}
                  onMouseEnter={() => setHoveredState(abbr)}
                  onMouseLeave={() => setHoveredState(null)}
                  className={cn(
                    "aspect-square rounded touch-target relative group",
                    "transition-all duration-200",
                    "hover:scale-110 hover:z-10 active:scale-95",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  )}
                  style={{
                    gridColumn: colIndex + 1,
                    gridRow: rowIndex + 1,
                    backgroundColor: getScoreColor(stateScore),
                  }}
                  aria-label={`View ${stateData?.name || abbr} details`}
                >
                  <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-sm">
                    {abbr}
                  </span>

                  {/* Tooltip on hover/touch */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block group-focus:block">
                    <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                      {stateData?.name}
                      {stateScore && (
                        <span className="ml-2 font-semibold">{stateScore}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile-optimized stats */}
      {showStats && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Stats cards with better mobile spacing */}
        </div>
      )}
    </div>
  );
}
```

---

### 7. Responsive Spacing System

**Solution:** Add comprehensive spacing utilities

Update `src/index.css`:
```css
@layer utilities {
  /* Responsive spacing */
  .section-padding {
    @apply px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16;
  }

  .card-padding {
    @apply p-4 sm:p-5 lg:p-6;
  }

  .content-spacing {
    @apply space-y-4 sm:space-y-5 lg:space-y-6;
  }

  .gap-mobile {
    @apply gap-3 sm:gap-4 lg:gap-6;
  }

  /* Container constraints */
  .container-mobile {
    @apply mx-auto max-w-full px-4 sm:max-w-2xl sm:px-6 lg:max-w-4xl xl:max-w-6xl xl:px-8;
  }
}
```

---

### 8. Mobile Dialog/Modal Optimization

**Issue:** Dialogs can be awkward on mobile screens.

**Solution:** Make dialogs full-screen on mobile

Example implementation:
```tsx
<Dialog>
  <DialogContent className="sm:max-w-[600px] h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] w-full sm:w-auto sm:rounded-lg rounded-none p-0">
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <DialogHeader className="p-4 sm:p-6 border-b bg-background sticky top-0 z-10">
        <DialogTitle className="text-lg sm:text-xl">Dialog Title</DialogTitle>
        <DialogDescription className="text-sm sm:text-base">
          Description text
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Content goes here */}
      </div>

      {/* Sticky footer with actions */}
      <div className="p-4 sm:p-6 border-t bg-background sticky bottom-0">
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button className="w-full sm:w-auto">
            Confirm
          </Button>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

### 9. Optimize Data Tables for Mobile

**Issue:** Tables with many columns are hard to read on mobile.

**Solution:** Create card-style mobile layouts

Update `src/index.css`:
```css
@layer components {
  /* Mobile table to cards transformation */
  @media (max-width: 640px) {
    .table-mobile-cards thead {
      @apply sr-only;
    }

    .table-mobile-cards tbody {
      @apply space-y-4;
    }

    .table-mobile-cards tr {
      @apply block border rounded-lg p-4 bg-card;
    }

    .table-mobile-cards td {
      @apply block py-2 text-sm;
    }

    .table-mobile-cards td::before {
      content: attr(data-label);
      @apply font-semibold inline-block min-w-[120px] mr-2;
    }
  }

  /* Horizontal scroll wrapper for complex tables */
  .table-scroll-wrapper {
    @apply w-full overflow-x-auto -mx-4 sm:mx-0;
  }

  .table-scroll-wrapper table {
    @apply min-w-[640px];
  }
}
```

**Usage:**
```tsx
{/* Mobile: Card layout, Desktop: Table */}
<table className="w-full table-mobile-cards">
  <thead>
    <tr>
      <th>Member</th>
      <th>Party</th>
      <th>Score</th>
      <th>State</th>
    </tr>
  </thead>
  <tbody>
    {members.map((member) => (
      <tr key={member.id}>
        <td data-label="Member">{member.name}</td>
        <td data-label="Party">{member.party}</td>
        <td data-label="Score">{member.score}</td>
        <td data-label="State">{member.state}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### 10. Accessibility & Motion

**Solution:** Respect user preferences

Update `src/index.css`:
```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Ensure focus visibility */
@layer base {
  *:focus-visible {
    @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-background;
  }
}

/* Safe area insets for notched devices */
@supports (padding: env(safe-area-inset-bottom)) {
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .safe-area-inset-top {
    padding-top: env(safe-area-inset-top);
  }
}
```

---

## Implementation Priority

### Phase 1: Critical (Week 1)
**Edge Functions:**
1. ✅ Add response caching layer
2. ✅ Implement database connection pooling
3. ✅ Add structured logging

**Mobile:**
1. ✅ Fix touch target sizes (44x44px minimum)
2. ✅ Update form input heights (48px minimum)
3. ✅ Add responsive text utilities

### Phase 2: Important (Week 2)
**Edge Functions:**
1. ✅ Implement circuit breaker pattern
2. ✅ Add response compression
3. ✅ Optimize batch processing

**Mobile:**
1. ✅ Add bottom navigation bar
2. ✅ Optimize mobile dialogs
3. ✅ Improve map component touch interactions

### Phase 3: Enhancement (Week 3)
**Edge Functions:**
1. ✅ Add performance monitoring
2. ✅ Implement health check endpoints
3. ✅ Add rate limit headers

**Mobile:**
1. ✅ Transform tables to cards on mobile
2. ✅ Add mobile-specific animations
3. ✅ Optimize image loading

---

## Testing Requirements

### Edge Function Testing
- [ ] Load test with 100+ concurrent requests
- [ ] Test cache hit rates (target: >70%)
- [ ] Verify circuit breaker opens after 5 failures
- [ ] Check response compression reduces size by >60%
- [ ] Monitor database connection pool efficiency

### Mobile Testing
- [ ] Test on iPhone SE (375px) - smallest modern device
- [ ] Test on iPhone 14 Pro (393px)
- [ ] Test on iPhone 14 Pro Max (430px)
- [ ] Test on iPad Mini (768px)
- [ ] Test on iPad Pro (1024px)

### Performance Benchmarks
- [ ] Lighthouse mobile score > 90
- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.8s on 3G
- [ ] All touch targets minimum 44x44px
- [ ] No horizontal scroll on any viewport

---

## Monitoring & Observability

### Key Metrics to Track

**Edge Functions:**
- Request latency (p50, p95, p99)
- Error rates by function
- Cache hit/miss ratios
- Circuit breaker state changes
- Database query duration
- External API quota usage

**Mobile:**
- Core Web Vitals (LCP, FID, CLS)
- Viewport distribution
- Touch vs mouse interactions
- Navigation patterns
- Error rates by device type

---

## Resources & References

**Edge Functions:**
- [Supabase Edge Functions Best Practices](https://supabase.com/docs/guides/functions/best-practices)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

**Mobile Responsiveness:**
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design - Mobile UX](https://material.io/design/layout/responsive-layout-grid.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Conclusion

This guide provides a comprehensive roadmap for improving both the edge function architecture and mobile user experience. The improvements are designed to be implemented incrementally, with the most impactful changes prioritized in Phase 1.

**Expected Outcomes:**
- 50-70% reduction in edge function latency through caching
- 60-80% reduction in external API calls
- 40% improvement in mobile Lighthouse scores
- 100% of interactive elements meet touch target guidelines
- Better user experience across all device sizes

All recommendations use industry best practices and are designed to work within the existing tech stack (Supabase, Deno, React, Tailwind CSS).
