import { NextRequest, NextResponse } from 'next/server';
import { getHttpRequestDuration, getHttpRequestsTotal } from '../metrics/registry';

// Accept any handler signature: no-arg, (req), (req, context) — all are valid Next.js route handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js App Router route handler to track:
 *  - http_request_duration_seconds  (histogram)
 *  - http_requests_total            (counter)
 *
 * Usage:
 *   export const GET = withMetrics('GET /api/pages', async (req) => { ... });
 *
 * The `route` label should be the static route pattern, e.g. '/api/pages/[id]',
 * not the actual URL, to keep cardinality low.
 */
export function withMetrics(route: string, handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    const method = req.method;
    const end = getHttpRequestDuration().startTimer({ method, route });

    let response: NextResponse;
    try {
      response = await handler(req, ctx);
    } catch (err) {
      // Count server errors — re-throw so Next.js error handling still works
      getHttpRequestsTotal().inc({ method, route, status_code: '500' });
      end({ method, route, status_code: '500' });
      throw err;
    }

    const statusCode = String(response.status);
    getHttpRequestsTotal().inc({ method, route, status_code: statusCode });
    end({ method, route, status_code: statusCode });

    return response;
  };
}
