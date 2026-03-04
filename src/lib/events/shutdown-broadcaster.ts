/**
 * Shutdown broadcaster — server-side singleton.
 *
 * Keeps track of all active SSE stream controllers and sends a "shutdown"
 * event to every connected client when broadcastShutdown() is called.
 *
 * This module must only be imported server-side (route handlers, instrumentation).
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const controllers = new Set<SSEController>();
const encoder = new TextEncoder();

export function registerSSEController(ctrl: SSEController): void {
  controllers.add(ctrl);
}

export function unregisterSSEController(ctrl: SSEController): void {
  controllers.delete(ctrl);
}

/** Returns the number of currently connected SSE clients. */
export function connectedClients(): number {
  return controllers.size;
}

/**
 * Sends `event: shutdown\ndata: {}\n\n` to every connected SSE client.
 * Silently ignores controllers that have already been closed.
 */
export function broadcastShutdown(): void {
  const payload = encoder.encode('event: shutdown\ndata: {}\n\n');
  for (const ctrl of controllers) {
    try {
      ctrl.enqueue(payload);
    } catch {
      // Controller was already closed — clean up silently
      controllers.delete(ctrl);
    }
  }
}
