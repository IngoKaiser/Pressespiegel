export async function POST(request) {
  const { sourceUrl, sourceName } = await request.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  try {
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
        system: 'Du bist ein JSON-Generator. Antworte IMMER nur mit einem validen JSON-Array. Kein anderer Text. Keine Backticks. Kein Markdown. Wenn du nichts findest: []',
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Finde die aktuellen Schlagzeilen von "${sourceName}" (${sourceUrl}).

Gib ein JSON-Array mit 5-10 Artikeln zurück. Jedes Element:
{"title": "Überschrift", "summary": "1-2 Sätze Teaser", "url": "https://...", "paywall": false}

Setze paywall auf true bei Premium/Plus-Artikeln (S+, Z+, F+, SZ Plus etc.).
NUR das JSON-Array ausgeben.`,
        }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({
        error: `API ${resp.status}`,
        details: errText.slice(0, 300),
      }, { status: resp.status });
    }

    const data = await resp.json();

    // Extract text content
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    if (!text.trim()) {
      const types = (data.content || []).map((b) => b.type).join(', ');
      return Response.json({
        error: 'Kein Text in Antwort',
        details: `Block-Typen: [${types}], stop_reason: ${data.stop_reason}`,
      }, { status: 500 });
    }

    // Parse JSON from response
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    // Try direct parse
    try {
      const r = JSON.parse(cleaned);
      if (Array.isArray(r)) return Response.json({ articles: r });
    } catch {}

    // Find JSON array
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        const r = JSON.parse(arrMatch[0]);
        if (Array.isArray(r)) return Response.json({ articles: r });
      } catch {}
      // Try repair
      let attempt = arrMatch[0].replace(/,\s*\{[^}]*$/, '') + ']';
      try {
        const r = JSON.parse(attempt);
        if (Array.isArray(r)) return Response.json({ articles: r });
      } catch {}
    }

    // Find individual objects
    const objs = [...cleaned.matchAll(/\{[^{}]*"title"[^{}]*\}/g)];
    if (objs.length > 0) {
      const arr = [];
      for (const m of objs) { try { arr.push(JSON.parse(m[0])); } catch {} }
      if (arr.length > 0) return Response.json({ articles: arr });
    }

    return Response.json({
      error: 'JSON nicht parsbar',
      raw: cleaned.slice(0, 400),
    }, { status: 500 });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
