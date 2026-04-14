# Pressespiegel

Persönlicher Nachrichtenüberblick — RSS-first, Claude API als Fallback.

## RSS-First-Ansatz

- 30+ vorgemappte Feeds (Spiegel, FAZ, Zeit, Tagesschau, BBC, NYT…)
- Auto-Discovery für unbekannte Quellen
- Claude API nur als Fallback für Seiten ohne RSS
- Kein Token-Limit-Problem, schnell, kostenlos

## Setup

### Vercel
1. ZIP importieren oder GitHub-Repo verbinden
2. Optional: `ANTHROPIC_API_KEY` als Env-Var (nur Fallback)
3. Deploy

### Lokal
```bash
npm install
npm run dev
```

## Architektur
```
app/page.js                → Frontend (responsive React)
app/api/headlines/route.js → RSS + Claude-Fallback
app/api/article/route.js   → HTML-Extraktion + Claude-Fallback
```
