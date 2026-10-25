---
key: "ea_precommit"
role: "ea"
order: 1
title: "Pre-Commit"
months: 3
tags: ["python", "perforce", "jenkins", "game", "tools"]
---
- Built an extensible pre-commit framework for the Star Wars: Galaxy of Heroes team, triggering on peer review requests via Jenkins
- Each test scopes itself to relevant file changes to minimize run time, focused on the team's most common failure modes including missing files and assembly issues
