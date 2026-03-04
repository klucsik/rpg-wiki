/**
 * In-flight request tracker — server-side singleton.
 *
 * Route handlers that need to be drained before shutdown can call
 * increment() at the start of a request and decrement() when done.
 *
 * The drain() helper returns a Promise that resolves when the counter
 * reaches zero, or after the given timeout (whichever comes first).
 */

let inflight = 0;
const waiters: Array<() => void> = [];

export function increment(): void {
  inflight++;
}

export function decrement(): void {
  inflight = Math.max(0, inflight - 1);
  if (inflight === 0) {
    // Resolve all pending drain() calls
    const fns = waiters.splice(0);
    for (const fn of fns) fn();
  }
}

export function currentCount(): number {
  return inflight;
}

/**
 * Returns a Promise that resolves when there are no in-flight requests,
 * or after `timeoutMs` milliseconds — whichever comes first.
 */
export function drain(timeoutMs: number): Promise<void> {
  if (inflight === 0) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // Remove our waiter and resolve even if count isn't zero
      const idx = waiters.indexOf(done);
      if (idx !== -1) waiters.splice(idx, 1);
      resolve();
    }, timeoutMs);

    function done() {
      clearTimeout(timer);
      resolve();
    }

    waiters.push(done);
  });
}
