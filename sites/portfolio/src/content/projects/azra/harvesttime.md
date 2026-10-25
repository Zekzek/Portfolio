---
key: "azra_harvesttime"
role: "azra"
order: 3
title: "Harvest Time"
months: 4
tags: ["js", "aws", "bigquery", "unity", "perforce", "teamcity", "game", "tools"]
---
- Solo-built a full-stack internal web application (React + Node.js/Express, deployed on GCP Cloud Run) serving as the central control plane for automated game testing
- Unified Perforce, TeamCity, and AWS Device Farm into a single workflow with an auto-orchestration engine and priority-weighted test scheduling
- Built automated crash analysis pipeline that classifies test failures (OOM, ANR, Jetsam, loading stalls, game crashes vs. infrastructure failures) by parsing device logs – with alerting tied to specific changelists, devices, and tests
- Created interactive 3D performance heatmaps (Three.js) visualizing framerate, memory, and GPU/CPU time across game zones – supports compare mode, LOD rendering, and filtering by device, branch, and changelist
- Designed the data layer across BigQuery, Firestore, SQLite, and GCS; role-based access control via Firebase Auth
