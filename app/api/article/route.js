// In-memory cookie store per domain (persists across requests during server lifetime)
const cookieStore = {};

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function getCookies(domain) {
  return cookieStore[domain] || '';
}

function storeCookies(domain, setCookieHeaders) {
  if (!setCookieHeaders) return;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  const existing = cookieStore[domain] ? cookieStore[domain].split('; ') : [];
  const cookieMap = {};
  existing.forEach(c => { const [k] = c.split('='); if (k) cookieMap[k.trim()] = c; });
  headers.forEach(h => {
    const cookiePart = h.split(';')[0]; // Just name=value
    const [k] = cookiePart.split('=');
    if (k) cookieMap[k.trim()] = cookiePart;
  });
  cookieStore[domain] = Object.values(cookieMap).join('; ');
}

// Pre-accept common cookie consent cookies for German news sites
function getConsentCookies(domain) {
  const consent = [
    // Common CMP (Consent Management Platform) cookies
    'euconsent-v2=CPz_EXAMPLE; ',
    'consentUUID=accepted; ',
    'cookieConsent=accepted; ',
    'cookie_consent=1; ',
    'cc_cookie=accepted; ',
    'didomi_token=accepted; ',
    'CookieConsent=true; ',
    'consent_given=1; ',
    'privacy_accepted=1; ',
    'gdpr_consent=1; ',
    'tracking_consent=accepted; ',
    // Sourcepoint (used by Spiegel, Zeit, etc.)
    'sp_consent=accepted; ',
    // Specific sites
    'spiegel_consent=true; ',
  ];
  return consent.join('');
}

async function fetchArticle(url) {
  const domain = getDomain(url);
  const savedCookies = getCookies(domain);
  const consentCookies = getConsentCookies(domain);

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Cookie': consentCookies + savedCookies,
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });

  // Store any cookies from the response
  const setCookie = resp.headers.getSetCookie?.() || resp.headers.get('set-cookie');
  if (setCookie) storeCookies(domain, setCookie);

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

function extractArticleText(html) {
  // Remove noise
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Prefer <article> content
  const articleMatch = clean.match(/<article[\s\S]*?<\/article>/i);
  const block = articleMatch ? articleMatch[0] : clean;

  // Extract paragraphs
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRegex.exec(block)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim();
    if (text.length > 40) paragraphs.push(text);
  }

  return paragraphs;
}

function detectPaywall(html, paragraphCount) {
  if (paragraphCount >= 5) return false;
  return /paywall|pur-abo|plus-abo|registrier.*lesen|jetzt.*testen|abo.*abschlie|premium.*content|offer-page|piano-offer/i.test(html);
}

export async function POST(request) {
  const { url, title } = await request.json();

  try {
    const html = await fetchArticle(url);
    const paragraphs = extractArticleText(html);

    if (paragraphs.length >= 3) {
      if (detectPaywall(html, paragraphs.length)) {
        return Response.json({ content: 'PAYWALL', method: 'direct' });
      }
      return Response.json({ content: paragraphs.join('\n\n'), method: 'direct' });
    }

    // Too few paragraphs — likely paywall or JS-rendered
    if (detectPaywall(html, paragraphs.length)) {
      return Response.json({ content: 'PAYWALL', method: 'direct' });
    }

    // Try API fallback
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({
        content: paragraphs.length > 0
          ? paragraphs.join('\n\n')
          : 'Artikeltext konnte nicht extrahiert werden. Möglicherweise JS-gerendert oder Paywall.',
        method: 'direct-partial',
      });
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 4096,
        system: 'Artikeltext in Absätzen. Keine Navigation/Werbung. Paywall → nur PAYWALL',
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: `Artikel: "${title}"\nURL: ${url}` }],
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
      return Response.json({ content: text || 'Kein Inhalt.', method: 'api' });
    }

    return Response.json({
      content: paragraphs.length > 0 ? paragraphs.join('\n\n') : 'Artikel nicht ladbar.',
      method: 'direct-fallback',
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
