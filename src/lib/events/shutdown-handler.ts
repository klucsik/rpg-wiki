/**
 * Graceful shutdown handler.
 *
 * Call registerShutdownHandler() once at server startup (from instrumentation.ts).
 *
 * On SIGTERM / SIGINT it will:
 *   1. Broadcast a "shutdown" SSE event to every connected editor tab so the
 *      client can fire a sendBeacon autosave before the process exits.
 *   2. Wait up to DRAIN_TIMEOUT_MS for any in-flight autosave POST requests
 *      to complete (drain), then exit cleanly.
 */

import { broadcastShutdown } from './shutdown-broadcaster';
import { drain } from './inflight-tracker';

const DRAIN_TIMEOUT_MS = 5_000;

async function handleShutdown(signal: string) {
  console.log(`[shutdown] Received ${signal} — broadcasting shutdown to connected clients`);
  broadcastShutdown();

  console.log(`[shutdown] Waiting up to ${DRAIN_TIMEOUT_MS}ms for in-flight autosave requests…`);
  await drain(DRAIN_TIMEOUT_MS);
  console.log('[shutdown] Drain complete — exiting');

  process.exit(0);
}

export function registerShutdownHandler() {
  process.once('SIGTERM', () => void handleShutdown('SIGTERM'));
  process.once('SIGINT',  () => void handleShutdown('SIGINT'));
}
