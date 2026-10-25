---
key: "azra_precommit"
role: "azra"
order: 1
title: "Pre-Commit"
months: 6
tags: ["perforce", "swarm", "teamcity", "game", "tools"]
---
- Built pre-commit system that runs a targeted ~15-minute build on every peer review request, catching missing files, assembly definition gaps, and debug-flag hook mismatches before merge
- Catches the vast majority of would-be build breaks – remaining gaps are cases where submitters don't wait for results
- Team has come to rely on the system – active enough to flag 4 separate issues in a single day
