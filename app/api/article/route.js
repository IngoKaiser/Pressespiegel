export async function POST(request) {
  const { url, title } = await request.json();

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
        system: 'Du bist ein Artikelleser. Gib den Artikeltext in sauberen Absätzen wieder. Keine Navigation, Werbung, Kommentare, Meta-Infos oder Erklärungen. Nur den reinen Artikelinhalt. Wenn der Artikel hinter einer Paywall steht, antworte nur mit: PAYWALL',
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Lies den folgenden Artikel und gib den Text wieder:\nTitel: "${title}"\nURL: ${url}`,
        }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({ error: `API ${resp.status}`, details: errText.slice(0, 300) }, { status: resp.status });
    }

    const data = await resp.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return Response.json({ content: text || 'Kein Inhalt gefunden.' });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
