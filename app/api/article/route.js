const cookieStore = {};
function gd(url) { try { return new URL(url).hostname; } catch { return ''; } }
function gc(d) { return cookieStore[d] || ''; }
function sc(d, h) {
  if (!h) return;
  const arr = Array.isArray(h) ? h : [h];
  const map = {};
  (cookieStore[d] || '').split('; ').forEach(c => { const [k] = c.split('='); if (k) map[k.trim()] = c; });
  arr.forEach(h => { const p = h.split(';')[0]; const [k] = p.split('='); if (k) map[k.trim()] = p; });
  cookieStore[d] = Object.values(map).join('; ');
}

const CONSENT = 'euconsent-v2=accepted; CookieConsent=true; consent_given=1; gdpr_consent=1; sp_consent=accepted; ';

// Paywall phrases found in article body text
const PAYWALL_PHRASES = [
  'Sie können den Artikel leider nicht',
  'Der Link, der Ihnen geschickt wurde',
  'Artikel wurde bereits 10 Mal geöffnet',
  'Digital-Abo', 'Zum Login',
  'Jetzt weiterlesen', 'Registrieren Sie sich',
  'Melden Sie sich an', 'Anmelden und weiterlesen',
  'Dieser Artikel ist für Abonnenten',
  'Um diesen Artikel zu lesen',
  'Diesen Artikel lesen Sie mit',
  'Bereits Abonnent?', 'Print-Abo',
  'Digital-Zugang bestellen',
  'Ihr Heimathafen für lokale Nachrichten',
];

// Paragraphs containing these get removed entirely
const REMOVE_IF_CONTAINS = [
  /aufklappen/i,
  /Automatisch erstellt mit KI/i,
  /War die Zusammenfassung hilfreich/i,
  /positiv bewerten.*negativ bewerten/i,
  /negativ bewerten.*positiv bewerten/i,
  /Mehr Informationen dazu hier/i,
  /Danke für Ihr Feedback/i,
  /Bild vergrößern/i,
  /Foto:\s*\w/i,
  /Quelle:\s*\w/i,
  /^\s*Anzeige\s*$/i,
  /^\s*Werbung\s*$/i,
  /Lesen Sie auch/i,
  /Mehr zum Thema/i,
  /Zur Merkliste/i,
  /Artikel teilen/i,
  /Kommentare\s*\(\d+\)/i,
  /icon_cookie/i,
  /Newsletter.*abonnieren/i,
  /Jetzt testen/i,
  /Jetzt sparen/i,
  /SPIEGEL.*Account/i,
  /Laden Sie sich jetzt/i,
  /Empfohlener externer Inhalt/i,
  /An dieser Stelle finden Sie/i,
  /Ich bin damit einverstanden/i,
  /Externe Inhalte laden/i,
  /Hier können Sie die Rechte/i,
  /Alle Rechte vorbehalten/i,
  /Mehr lesen über/i,
  /Feedback.*an.*Redaktion/i,
];

function cleanParagraphs(paragraphs) {
  return paragraphs.filter(p => {
    if (p.length < 25) return false;
    // Filter lines starting with image-like descriptions
    if (/^(Bild|Foto|Grafik|Illustration|Symbolbild|Quelle|Video|Audio)\s/i.test(p)) return false;
    // Filter cookie/consent
    if (/cookie|datenschutz/i.test(p) && p.length < 150) return false;
    // Filter any paragraph matching remove patterns
    if (REMOVE_IF_CONTAINS.some(pat => pat.test(p))) return false;
    // Filter very short lines that are likely UI elements
    if (p.length < 50 && /^(teilen|drucken|senden|merken|bewerten|kommentieren|antworten)/i.test(p)) return false;
    return true;
  });
}

function detectPaywall(paragraphs) {
  const text = paragraphs.join(' ');
  return PAYWALL_PHRASES.some(phrase => text.includes(phrase));
}

function extractImages(html) {
  const images = [];
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  const block = articleMatch ? articleMatch[0] : html;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*/gi;
  let m;
  while ((m = imgRegex.exec(block)) !== null && images.length < 5) {
    const src = m[1];
    if (/1x1|pixel|tracking|logo|icon|avatar|button|arrow|spinner|\.gif$/i.test(src)) continue;
    const w = m[0].match(/width=["']?(\d+)/i);
    if (w && parseInt(w[1]) < 100) continue;
    images.push(src);
  }
  return images;
}

async function fetchArticle(url) {
  const domain = gd(url);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'de-DE,de;q=0.9',
      'Cookie': CONSENT + gc(domain),
    },
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  });
  const ck = resp.headers.getSetCookie?.() || resp.headers.get('set-cookie');
  if (ck) sc(domain, ck);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

export async function POST(request) {
  const { url, title } = await request.json();
  try {
    const html = await fetchArticle(url);
    const images = extractImages(html);

    let clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<figure[\s\S]*?<\/figure>/gi, '')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, '')
      .replace(/<button[\s\S]*?<\/button>/gi, '')
      .replace(/<form[\s\S]*?<\/form>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
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
      if (text.length > 25) rawParagraphs.push(text);
    }

    // Check paywall BEFORE cleaning
    if (detectPaywall(rawParagraphs)) {
      return Response.json({ content: 'PAYWALL', method: 'direct', images });
    }

    const paragraphs = cleanParagraphs(rawParagraphs);

    if (paragraphs.length >= 2) {
      return Response.json({ content: paragraphs.join('\n\n'), method: 'direct', images });
    }

    // Too few paragraphs = likely paywall, video, audio, or interactive content
    return Response.json({
      content: paragraphs.length > 0 ? paragraphs.join('\n\n') : 'NOT_EXTRACTABLE',
      method: paragraphs.length > 0 ? 'direct-partial' : 'failed',
      images,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
