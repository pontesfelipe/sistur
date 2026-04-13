import { useClientErrorMonitor } from '@/hooks/useClientErrorMonitor';

/**
 * Silent component that activates client-side error monitoring.
 * Must be rendered inside AuthProvider context.
 */
export function ClientErrorMonitor() {
  useClientErrorMonitor();
  return null;
}
