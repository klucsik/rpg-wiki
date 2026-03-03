import { Registry, collectDefaultMetrics, Histogram, Counter } from 'prom-client';

// Use a global to survive Next.js hot-reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __metricsRegistry: Registry | undefined;
  // eslint-disable-next-line no-var
  var __metricsInitialized: boolean | undefined;
}

function createRegistry(): Registry {
  const registry = new Registry();

  registry.setDefaultLabels({
    service: 'rpg-wiki',
  });

  collectDefaultMetrics({ register: registry });

  return registry;
}

export function getRegistry(): Registry {
  if (!global.__metricsRegistry) {
    global.__metricsRegistry = createRegistry();
  }
  return global.__metricsRegistry;
}

// ---- HTTP request metrics ----

let httpRequestDuration: Histogram | undefined;
let httpRequestsTotal: Counter | undefined;

export function getHttpRequestDuration(): Histogram {
  if (!httpRequestDuration) {
    const registry = getRegistry();
    // prom-client throws if a metric with the same name is registered twice
    const existing = registry.getSingleMetric('http_request_duration_seconds');
    if (existing) {
      httpRequestDuration = existing as Histogram;
    } else {
      httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [registry],
      });
    }
  }
  return httpRequestDuration;
}

export function getHttpRequestsTotal(): Counter {
  if (!httpRequestsTotal) {
    const registry = getRegistry();
    const existing = registry.getSingleMetric('http_requests_total');
    if (existing) {
      httpRequestsTotal = existing as Counter;
    } else {
      httpRequestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        registers: [registry],
      });
    }
  }
  return httpRequestsTotal;
}
