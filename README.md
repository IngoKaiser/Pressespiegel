# Pressespiegel

Dein persönlicher Nachrichtenüberblick — aggregiert Schlagzeilen aus beliebigen Nachrichtenquellen.

## Setup

### 1. Vercel Deployment (empfohlen)

1. Repo auf GitHub pushen oder als ZIP bei Vercel importieren
2. In Vercel unter **Settings → Environment Variables** hinzufügen:
   - `ANTHROPIC_API_KEY` = dein API-Key von [console.anthropic.com](https://console.anthropic.com)
3. Deployen — fertig!

### 2. Lokal testen

```bash
# Dependencies installieren
npm install

# API-Key setzen
cp .env.example .env.local
# .env.local editieren und Key eintragen

# Starten
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

## Funktionsweise

- **Quellen hinzufügen**: Beliebige Nachrichten-URL eingeben (z.B. `spiegel.de`, `faz.net`, `tagesschau.de`)
- **Schlagzeilen laden**: Die App nutzt die Claude API mit Web Search, um aktuelle Artikel von der Startseite zu finden
- **Reader-Ansicht**: Klick auf einen Artikel lädt den Volltext (falls nicht hinter Paywall)
- **Quellen & Cache**: Quellen werden im Browser gespeichert, Artikel 30 Minuten gecacht

## Architektur

```
app/
  page.js          → Frontend (React Client Component)
  layout.js        → Root Layout mit Fonts
  globals.css      → CSS Variables & Base Styles
  api/
    headlines/
      route.js     → Server-Route: Claude API → Schlagzeilen als JSON
    article/
      route.js     → Server-Route: Claude API → Artikeltext
```

API-Calls laufen über Next.js Server Routes → kein CORS-Problem, API-Key bleibt serverseitig.
