/**
 * Next.js instrumentation hook — runs once when the server starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Initialises prom-client default metrics and registers the graceful-shutdown
 * handler (see src/lib/events/shutdown-handler.ts).
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge / browser bundles)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getRegistry } = await import('./src/lib/metrics/registry');
    getRegistry();

    const { registerShutdownHandler } = await import('./src/lib/events/shutdown-handler');
    registerShutdownHandler();
  }
}
