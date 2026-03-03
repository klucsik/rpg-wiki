/**
 * Next.js instrumentation hook — runs once when the server starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This initialises prom-client default metrics (Node.js runtime: CPU, memory,
 * heap, GC pauses, event loop lag) so they are ready before the first request.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge / browser bundles)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getRegistry } = await import('./src/lib/metrics/registry');
    // Accessing the registry triggers createRegistry() → collectDefaultMetrics()
    getRegistry();
  }
}
