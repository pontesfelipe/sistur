/**
 * Shared constants for the AI project generation flow.
 *
 * `MAX_AI_ITEMS` MUST match the slice size in
 * `supabase/functions/generate-project-structure/index.ts`. The edge function
 * echoes its own value in the response as `maxAiItems`, letting the client
 * detect and surface drift before it silently mis-maps issue/prescription ids.
 */
export const MAX_AI_ITEMS = 15;
