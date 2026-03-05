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

// ---- Per-page business metrics ----

let pageViewsTotal: Counter | undefined;
let pageEditsTotal: Counter | undefined;

export function getPageViewsTotal(): Counter {
  if (!pageViewsTotal) {
    const registry = getRegistry();
    const existing = registry.getSingleMetric('page_views_total');
    if (existing) {
      pageViewsTotal = existing as Counter;
    } else {
      pageViewsTotal = new Counter({
        name: 'page_views_total',
        help: 'Total number of times a published page has been viewed',
        labelNames: ['page_id', 'page_path', 'page_title'],
        registers: [registry],
      });
    }
  }
  return pageViewsTotal;
}

export function getPageEditsTotal(): Counter {
  if (!pageEditsTotal) {
    const registry = getRegistry();
    const existing = registry.getSingleMetric('page_edits_total');
    if (existing) {
      pageEditsTotal = existing as Counter;
    } else {
      pageEditsTotal = new Counter({
        name: 'page_edits_total',
        help: 'Total number of times a page has been published (saved)',
        labelNames: ['page_id', 'page_path', 'page_title'],
        registers: [registry],
      });
    }
  }
  return pageEditsTotal;
}
