---
key: "azra_serverstresstest"
role: "azra"
order: 7
title: "Mass Request Tool"
months: 1
tags: ["unity", "csharp", "game", "mobile", "tools"]
---
- Built Unity-based tool to mass-send server requests using the same client code as the production game, enabling realistic gacha simulation at scale
- Ran weekend-long tests executing 100 10-pulls (1,000 results) per account across 10,000 accounts to build statistically reliable drop rate data
- Caught pity system bugs before launch through statistical analysis, mitigating legal and financial risk
- Distributed load across many accounts to prevent state accumulation from skewing results
- Extended to populate leaderboards with thousands of test entries
