import { NextResponse } from 'next/server';
import { getRegistry } from '../../../lib/metrics/registry';

/**
 * GET /api/metrics
 *
 * Prometheus text-format scrape endpoint.
 * Restrict access in production by only allowing requests from within the
 * cluster (e.g. via a NetworkPolicy or by not exposing this path via Ingress).
 */
export async function GET() {
  try {
    const registry = getRegistry();
    const metrics = await registry.metrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': registry.contentType,
        // Prevent caching so Prometheus always gets fresh data
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[metrics] Failed to collect metrics:', error);
    return NextResponse.json({ error: 'Failed to collect metrics' }, { status: 500 });
  }
}
