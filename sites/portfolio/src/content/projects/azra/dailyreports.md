---
key: "azra_dailyreports"
role: "azra"
order: 9
title: "Daily Reports"
months: 9
tags: ["python", "teamcity", "bigquery", "game", "tools"]
---
- Daily automated Slack reports flagging performance regressions and out-of-budget assets (models, textures, memory, download size), posted each morning
- When first deployed, only ~30% of runs met performance targets – consistent daily visibility drove that to 98–99% as the team focused on launch readiness
- Still surfaces ~1 new significant issue per week, typically in newly developed areas
- Integrated a scheduled Claude analysis job to summarize results across ~100 areas and 9 device models – replacing a dense data table with actionable daily highlights
