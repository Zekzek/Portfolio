---
key: "azra_performancemetrics"
role: "azra"
order: 4
title: "Performance Metrics"
months: 16
tags: ["unity", "csharp", "python", "aws", "bigquery", "mobile", "game", "tools"]
---
- Automated performance testing running 24/7 across 9 device models (6 Android, 3 iOS) via AWS Device Farm
- Built area discovery tool that automatically identifies player/enemy spawn points, zone transitions, and interactables – test coverage grows dynamically with new content, currently spanning ~100 in-game areas
- Capture Unity profiling data (CPU, GPU, memory) per run and store statistics (min, max, avg, P5, P95) in BigQuery
- Visualize results in Looker Studio dashboards with filtering by build, device model, and area
