const cookieStore = {};
function getDomain(url) { try { return new URL(url).hostname; } catch { return ''; } }
function getCookies(d) { return cookieStore[d] || ''; }
function storeCookies(d, h) {
  if (!h) return;
  const arr = Array.isArray(h) ? h : [h];
  const map = {};
  (cookieStore[d] || '').split('; ').forEach(c => { const [k] = c.split('='); if (k) map[k.trim()] = c; });
  arr.forEach(h => { const p = h.split(';')[0]; const [k] = p.split('='); if (k) map[k.trim()] = p; });
  cookieStore[d] = Object.values(map).join('; ');
}

const CONSENT = 'euconsent-v2=accepted; consentUUID=accepted; CookieConsent=true; consent_given=1; gdpr_consent=1; sp_consent=accepted; ';

// Phrases that indicate paywall/login wall in extracted text
const PAYWALL_PHRASES = [
  'Sie können den Artikel leider nicht mehr aufrufen',
  'Sie können den Artikel leider nicht',
  'Der Link, der Ihnen geschickt wurde',
  'Artikel wurde bereits 10 Mal geöffnet',
  'Digital-Abo',
  'Zum Login',
  'Print-Abo',
  'Digital-Zugang bestellen',
  'Jetzt testen',
  'Jetzt sparen',
  'Jetzt weiterlesen',
  'Registrieren Sie sich',
  'Melden Sie sich an',
  'Anmelden und weiterlesen',
  'Dieser Artikel ist für Abonnenten',
  'Um diesen Artikel zu lesen',
  'Diesen Artikel lesen Sie mit',
];

// Patterns to remove from article text
const NOISE_PATTERNS = [
  /Bild vergrößern[^\n]*/gi,
  /Foto:\s*[^\n]*/gi,
  /^Quelle:\s*[^\n]*/gim,
  /^\s*Anzeige\s*$/gim,
  /^\s*Werbung\s*$/gim,
  /Lesen Sie auch:?\s*/gi,
  /Mehr zum Thema:?\s*/gi,
  /icon_cookie[^\n]*/gi,
  /Zur Merkliste hinzufügen[^\n]*/gi,
  /Artikel teilen[^\n]*/gi,
  /Kommentare\s*\(\d+\)/gi,
];

function cleanArticleText(paragraphs) {
  return paragraphs
    .map(p => {
      let t = p;
      NOISE_PATTERNS.forEach(pat => { t = t.replace(pat, ''); });
      return t.trim();
    })
    .filter(p => {
      if (p.length < 30) return false;
      // Filter image alt texts (usually short descriptive phrases with specific patterns)
      if (/^(Bild|Foto|Grafik|Illustration|Symbolbild)\s/i.test(p)) return false;
      // Filter cookie/tracking consent text
      if (/cookie|datenschutz|tracking/i.test(p) && p.length < 120) return false;
      return true;
    });
}

function detectPaywallInText(paragraphs) {
  const fullText = paragraphs.join(' ');
  return PAYWALL_PHRASES.some(phrase => fullText.includes(phrase));
}

function extractImages(html) {
  const images = [];
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  const block = articleMatch ? articleMatch[0] : html;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
  let m;
  while ((m = imgRegex.exec(block)) !== null && images.length < 5) {
    const src = m[1];
    // Skip tiny images, tracking pixels, icons
    if (/1x1|pixel|tracking|logo|icon|avatar|button|arrow|spinner/i.test(src)) continue;
    if (/\.gif$/i.test(src) && !/giphy|tenor/i.test(src)) continue;
    // Check for width/height attrs suggesting it's small
    const widthMatch = m[0].match(/width=["']?(\d+)/i);
    if (widthMatch && parseInt(widthMatch[1]) < 100) continue;
    images.push(src);
  }
  return images;
}

async function fetchArticle(url) {
  const domain = getDomain(url);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Cookie': CONSENT + getCookies(domain),
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  const setCookie = resp.headers.getSetCookie?.() || resp.headers.get('set-cookie');
  if (setCookie) storeCookies(domain, setCookie);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

export async function POST(request) {
  const { url, title } = await request.json();
  try {
    const html = await fetchArticle(url);

    // Extract images
    const images = extractImages(html);

    // Clean HTML
    let clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<figure[\s\S]*?<\/figure>/gi, '') // Remove figure/caption blocks entirely
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    const articleMatch = clean.match(/<article[\s\S]*?<\/article>/i);
    const block = articleMatch ? articleMatch[0] : clean;

    const rawParagraphs = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRegex.exec(block)) !== null) {
      const text = m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim();
      if (text.length > 30) rawParagraphs.push(text);
    }

    const paragraphs = cleanArticleText(rawParagraphs);

    // Check for paywall in extracted text
    if (detectPaywallInText(rawParagraphs)) {
      return Response.json({ content: 'PAYWALL', method: 'direct', images });
    }

    if (paragraphs.length >= 2) {
      return Response.json({ content: paragraphs.join('\n\n'), method: 'direct', images });
    }

    return Response.json({
      content: paragraphs.length > 0 ? paragraphs.join('\n\n') : 'Artikeltext konnte nicht extrahiert werden.',
      method: 'direct-partial',
      images,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
