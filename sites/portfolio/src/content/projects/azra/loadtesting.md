---
key: "azra_loadtesting"
role: "azra"
order: 6
title: "Load Testing"
months: 2
tags: ["csharp", "perforce", "aws", "mobile", "game", "tools"]
---
- Built standalone C# application that emulates realistic gameplay message sequences against the live game server, using the game's own proto files to ensure protocol accuracy
- Dynamically parsed server responses to handle generated entity IDs and maintain test flow across sessions
- Deployed to AWS Fargate across 50 instances to simulate hundreds of concurrent users
- Collaborated with the server team through ~1 month of iterative testing cycles, surfacing hot-spot database queries and skippable calls – resolved with caching across ~3 significant performance improvements
