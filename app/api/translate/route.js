const PROMPTS = {
  einfach: {
    system: `Du schreibst Nachrichtenartikel für Jugendliche (12–14 Jahre) um.
Regeln:
- Einfache, klare Sprache – Fachbegriffe kurz erklären
- Hintergrundwissen ergänzen, das Jugendliche nicht kennen
- Alle Fakten und Zahlen beibehalten
- Freundlicher, interessierter Ton – nicht herablassend
- Gleich ausführlich wie das Original
- Kurze Sätze und Absätze
- Keine Emojis, kein YouTube-Ton
- Journalistischer Charakter beibehalten`,
    titlePrefix: 'Schreibe den folgenden Nachrichtentitel so um, dass ihn Jugendliche (12–14) sofort verstehen. NUR den umgeschriebenen Titel ausgeben:\n\n',
    summaryPrefix: 'Schreibe die folgende Zusammenfassung so um, dass sie Jugendliche (12–14) sofort verstehen. NUR die umgeschriebene Zusammenfassung ausgeben:\n\n',
    articlePrefix: 'Schreibe den folgenden Artikel so um, dass ihn Jugendliche (12–14) gut verstehen. NUR den umgeschriebenen Artikel ausgeben:\n\n',
  },
  jugend: {
    system: `Du schreibst Nachrichtenartikel in zeitgemäßer Jugendsprache um.
Regeln:
- Lockerer, natürlicher Ton wie unter Freunden
- Aktuelle Jugendsprache nutzen (aber nicht übertreiben)
- Fachbegriffe beiläufig erklären
- Alle Fakten und Zahlen beibehalten – nichts erfinden
- Kurze, knackige Sätze
- Keine Emojis
- Darf Slang enthalten, muss aber verständlich bleiben
- Informativ trotz lockerem Ton`,
    titlePrefix: 'Schreibe den folgenden Nachrichtentitel in lockerer Jugendsprache um. Kurz und knackig. NUR den umgeschriebenen Titel ausgeben:\n\n',
    summaryPrefix: 'Schreibe die folgende Zusammenfassung in Jugendsprache um. NUR die umgeschriebene Zusammenfassung ausgeben:\n\n',
    articlePrefix: 'Schreibe den folgenden Artikel in Jugendsprache um. NUR den umgeschriebenen Artikel ausgeben:\n\n',
  },
};

async function callClaude(system, prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error('Rate-Limit erreicht');
    throw new Error(`API ${resp.status}`);
  }

  const data = await resp.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

export async function POST(request) {
  const { mode, type, text } = await request.json();
  // mode: 'einfach' | 'jugend'
  // type: 'title' | 'summary' | 'article'
  // text: the original text

  if (!PROMPTS[mode]) return Response.json({ error: 'Ungültiger Modus' }, { status: 400 });
  if (!text?.trim()) return Response.json({ error: 'Kein Text' }, { status: 400 });

  const config = PROMPTS[mode];
  const prefix = type === 'title' ? config.titlePrefix
    : type === 'summary' ? config.summaryPrefix
    : config.articlePrefix;

  try {
    const result = await callClaude(config.system, prefix + text);
    return Response.json({ result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
