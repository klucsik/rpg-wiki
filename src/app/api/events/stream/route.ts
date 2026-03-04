import { NextRequest } from 'next/server';
import {
  registerSSEController,
  unregisterSSEController,
} from '@/lib/events/shutdown-broadcaster';

/**
 * GET /api/events/stream
 *
 * Long-lived Server-Sent Events stream.  Connected editor tabs subscribe to
 * this endpoint so the server can push a "shutdown" event to them before
 * Node.js exits (see instrumentation.ts).
 *
 * No sensitive data is exposed — the only event sent is `shutdown`.
 * The client's response to that event (firing a sendBeacon autosave) is
 * protected by the autosave route's own auth checks.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      registerSSEController(ctrl);

      // Initial keep-alive comment so the browser doesn't time out immediately
      ctrl.enqueue(encoder.encode(': connected\n\n'));
    },
    cancel() {
      unregisterSSEController(controller);
    },
  });

  // Unregister when the client disconnects (request aborted)
  req.signal.addEventListener('abort', () => {
    unregisterSSEController(controller);
    try {
      controller.close();
    } catch {
      // Already closed
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Allow the connection to stay open through proxies
      'X-Accel-Buffering': 'no',
    },
  });
}
