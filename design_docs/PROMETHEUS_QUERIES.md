# Prometheus Queries — rpg-wiki

All custom metrics carry the label `service="rpg-wiki"`.  
All queries below assume a 5-minute evaluation window unless stated otherwise.

---

## HTTP Traffic

### Request rate (req/s across all routes)
```promql
sum(rate(http_requests_total{service="rpg-wiki"}[5m]))
```

### Request rate — broken down by route
```promql
sum by (method, route) (
  rate(http_requests_total{service="rpg-wiki"}[5m])
)
```

### Error rate — 5xx responses (%)
```promql
100 * sum(rate(http_requests_total{service="rpg-wiki", status_code=~"5.."}[5m]))
  /
sum(rate(http_requests_total{service="rpg-wiki"}[5m]))
```

### Error rate — 4xx + 5xx per route
```promql
sum by (route, status_code) (
  rate(http_requests_total{service="rpg-wiki", status_code=~"[45].."}[5m])
)
```

---

## Latency

### Median (p50) response time across all routes
```promql
histogram_quantile(0.50,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{service="rpg-wiki"}[5m])
  )
)
```

### p95 response time across all routes
```promql
histogram_quantile(0.95,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{service="rpg-wiki"}[5m])
  )
)
```

### p99 response time across all routes
```promql
histogram_quantile(0.99,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{service="rpg-wiki"}[5m])
  )
)
```

### p95 latency — broken down per route (find the slowest endpoints)
```promql
histogram_quantile(0.95,
  sum by (le, route) (
    rate(http_request_duration_seconds_bucket{service="rpg-wiki"}[5m])
  )
)
```

### Average response time per route
```promql
sum by (route) (rate(http_request_duration_seconds_sum{service="rpg-wiki"}[5m]))
  /
sum by (route) (rate(http_request_duration_seconds_count{service="rpg-wiki"}[5m]))
```

---

## Node.js Runtime

### CPU usage (% of one core)
```promql
100 * rate(process_cpu_seconds_total{service="rpg-wiki"}[1m])
```

### Resident memory (RSS) in MB
```promql
process_resident_memory_bytes{service="rpg-wiki"} / 1024 / 1024
```

### Heap used vs. heap total (MB)
```promql
nodejs_heap_size_used_bytes{service="rpg-wiki"}  / 1024 / 1024
nodejs_heap_size_total_bytes{service="rpg-wiki"} / 1024 / 1024
```

### Heap used % (alert threshold: > 85%)
```promql
100 * nodejs_heap_size_used_bytes{service="rpg-wiki"}
     / nodejs_heap_size_total_bytes{service="rpg-wiki"}
```

### Event loop lag p99 in ms (high values = Node.js is CPU-blocked)
```promql
histogram_quantile(0.99,
  rate(nodejs_eventloop_lag_seconds_bucket{service="rpg-wiki"}[5m])
) * 1000
```

### GC pause duration p99 per GC type (in ms)
```promql
histogram_quantile(0.99,
  sum by (le, gctype) (
    rate(nodejs_gc_duration_seconds_bucket{service="rpg-wiki"}[5m])
  )
) * 1000
```

### Active handles (open sockets, timers, etc.)
```promql
nodejs_active_handles_total{service="rpg-wiki"}
```

### Open file descriptors
```promql
process_open_fds{service="rpg-wiki"}
```

---

## Per-Page Business Metrics

These counters are emitted with labels `page_id`, `page_path`, and `page_title`.

> **Note:** Labels are set at write time. If a page is renamed or its path changes,
> old label combinations remain in Prometheus with their historical counts.
> Use `page_id` for reliable identity across renames.

### Top 10 most-viewed pages (all time)
```promql
topk(10,
  sum by (page_id, page_path, page_title) (page_views_total{service="rpg-wiki"})
)
```

### Top 10 most-viewed pages in the last 7 days
```promql
topk(10,
  sum by (page_id, page_path, page_title) (
    increase(page_views_total{service="rpg-wiki"}[7d])
  )
)
```

### View rate (views/hour) per page — last 24 hours
```promql
sort_desc(
  sum by (page_path, page_title) (
    rate(page_views_total{service="rpg-wiki"}[24h]) * 3600
  )
)
```

### Top 10 most-edited pages (all time)
```promql
topk(10,
  sum by (page_id, page_path, page_title) (page_edits_total{service="rpg-wiki"})
)
```

### Edit activity over time — all pages (1h buckets)
```promql
sum(increase(page_edits_total{service="rpg-wiki"}[1h]))
```

### View-to-edit ratio per page (high ratio = popular read-only content)
```promql
sum by (page_path, page_title) (page_views_total{service="rpg-wiki"})
  /
sum by (page_path, page_title) (page_edits_total{service="rpg-wiki"} + 1)
```

### Pages with zero edits but views (untouched-but-read pages)
```promql
sum by (page_path, page_title) (page_views_total{service="rpg-wiki"})
  unless
sum by (page_path, page_title) (page_edits_total{service="rpg-wiki"})
```

---

## Recommended Alerts

| Alert | Condition | Suggested threshold |
|---|---|---|
| High error rate | `5xx rate / total rate > X%` | > 1% for 5 min |
| Slow p95 latency | `p95 latency` | > 2s for 5 min |
| High heap pressure | `heap used %` | > 85% for 5 min |
| High event loop lag | `eventloop lag p99` | > 100ms for 2 min |
| Process restart | `increase(process_start_time_seconds[5m]) > 0` | any restart |

### Example alert rule (Prometheus rules YAML)
```yaml
groups:
  - name: rpg-wiki
    rules:
      - alert: HighErrorRate
        expr: |
          100 * sum(rate(http_requests_total{service="rpg-wiki", status_code=~"5.."}[5m]))
            / sum(rate(http_requests_total{service="rpg-wiki"}[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "rpg-wiki 5xx error rate above 1%"

      - alert: HighP95Latency
        expr: |
          histogram_quantile(0.95,
            sum by (le) (rate(http_request_duration_seconds_bucket{service="rpg-wiki"}[5m]))
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "rpg-wiki p95 response time above 2s"

      - alert: HighHeapUsage
        expr: |
          100 * nodejs_heap_size_used_bytes{service="rpg-wiki"}
               / nodejs_heap_size_total_bytes{service="rpg-wiki"} > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "rpg-wiki heap usage above 85%"

      - alert: HighEventLoopLag
        expr: |
          histogram_quantile(0.99,
            rate(nodejs_eventloop_lag_seconds_bucket{service="rpg-wiki"}[5m])
          ) * 1000 > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "rpg-wiki event loop lag p99 above 100ms"
```
