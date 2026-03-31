# CLAUDE.md — HabitFlow AI Master Context

> Read this file first before doing anything. Then read the specific file for your current task.

---

## What Is This Project?

**HabitFlow AI** is a web app where users describe their week in plain text → AI Coach builds a realistic habit plan → auto-fills a visual calendar.

---

## Context Files — Read What You Need

| File | Read When |
|---|---|
| `PRD.md` | You need to understand features, user stories, or scope |
| `ARCHITECTURE.md` | You need to understand system design, layers, or data flow |
| `RULES.md` | You are writing ANY code — read this every time |
| `DATABASE.md` | You are working on models, migrations, or queries |
| `ROLES.md` | You are working on auth, permissions, or access control |
| `PHASES.md` | You want to know what to build next |

---

## Tech Stack (Quick Reference)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (React + TypeScript) |
| Styling | Tailwind CSS |
| Animations | Framer Motion + GSAP |
| Backend | Go + Gin |
| ORM | GORM |
| Database | Supabase (Postgres) |
| Cache | Redis |
| AI | Google Gemini API (free tier) via OpenRouter fallback |
| Calendar Sync | MCP — Google Calendar |
| CI/CD | GitHub Actions |
| Hosting | Railway |

---

## Project Structure (Root)

```
habitflow/
├── docs/context/        ← you are here
├── frontend/            ← Next.js 14 (React + TypeScript) project
├── backend/             ← Go + Gin + GORM
├── docker-compose.yml
├── .github/workflows/
└── README.md
```

---

## Current Phase

> **Update this section every time you start a new phase.**

- Current Phase: `Phase 6 — Calendar & AI Coach`
- Current Task: `Planning phase 6`
- Blocked By: `nothing`

---

## Doc Folder Conventions

| Folder | What Goes Here |
|---|---|
| `docs/context/` | Architecture, rules, database schema, roles, phases, CLAUDE.md |
| `docs/prp/` | Phase requirement plans — named `PRP-00N-phaseN-slug.md` |
| `docs/adr/` | Architecture decision records |

**Never place PRP files inside `docs/context/`.**

---

## Golden Rules (Always)

1. Never skip reading `RULES.md` before writing code
2. Never access the database from a handler directly — always go through service → repository
3. Never trust the frontend for role/subscription checks — always enforce server-side
4. Never put secrets or API keys in code — use environment variables
5. Commit message format: `feat:`, `fix:`, `chore:`, `docs:`
6. Always save PRP files to `docs/prp/` with the naming convention `PRP-00N-phaseN-slug.md`