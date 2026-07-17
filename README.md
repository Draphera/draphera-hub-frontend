# Draphera Hub — Frontend

Next.js 14 app for Draphera VectorEngine — HPGL viewer, CAD management, admin dashboard.

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # edit with your Supabase keys
npm run dev                         # → http://localhost:3000
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `NEXT_PUBLIC_API_BASE` | — | Backend URL (default: `http://localhost:8000`) |

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with VectorEngine cards |
| `/tools/hpgl` | VectorEngine HPGL viewer |
| `/admin` | Admin dashboard (uploads, training, founders) |
| `/dashboard` | User dashboard |
| `/dashboard/settings` | User profile & founder badge |

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Supabase Auth + REST
- Recharts (dashboard stats)
- Custom HPGL viewer (SVG)

## Build

```bash
npm run build
npm start
```
