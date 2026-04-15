import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Pressespiegel/2.0' },
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

const FEEDS = {
  'spiegel.de':'https://www.spiegel.de/schlagzeilen/index.rss',
  'faz.net':'https://www.faz.net/rss/aktuell/',
  'zeit.de':'https://newsfeed.zeit.de/index',
  'sueddeutsche.de':'https://rss.sueddeutsche.de/rss/Topthemen',
  'tagesschau.de':'https://www.tagesschau.de/index~rss2.xml',
  'welt.de':'https://www.welt.de/feeds/latest.rss',
  'n-tv.de':'https://www.n-tv.de/rss',
  'stern.de':'https://www.stern.de/feed/standard/all/',
  'focus.de':'https://rss.focus.de/fol/XML/rss_folnews.xml',
  'tagesspiegel.de':'https://www.tagesspiegel.de/contentexport/feed/home',
  'rp-online.de':'https://rp-online.de/feed.rss',
  'rnd.de':'https://www.rnd.de/arc/outboundfeeds/rss/',
  'merkur.de':'https://www.merkur.de/welt/rssfeed.rdf',
  'fr.de':'https://www.fr.de/rssfeed.rdf',
  'zdf.de':'https://www.zdf.de/rss/zdf/nachrichten',
  'deutschlandfunk.de':'https://www.deutschlandfunk.de/nachrichten-100.rss',
  'br.de':'https://www.br.de/nachrichten/feed/',
  'ndr.de':'https://www.ndr.de/nachrichten/index-rss.xml',
  'mdr.de':'https://www.mdr.de/nachrichten/index-rss.xml',
  'wdr.de':'https://www1.wdr.de/uebersicht-nachrichten-100.feed',
  'sportschau.de':'https://www.sportschau.de/index~rss2.xml',
  'handelsblatt.com':'https://www.handelsblatt.com/contentexport/feed/top-themen/',
  'manager-magazin.de':'https://www.manager-magazin.de/schlagzeilen/index.rss',
  'wiwo.de':'https://www.wiwo.de/contentexport/feed/rss/schlagzeilen',
  'capital.de':'https://www.capital.de/feed/rss',
  'finanzen.net':'https://www.finanzen.net/rss/news',
  'abendblatt.de':'https://www.abendblatt.de/rss',
  'morgenpost.de':'https://www.morgenpost.de/rss',
  'mopo.de':'https://www.mopo.de/feed/',
  'ksta.de':'https://www.ksta.de/feed/index.rss',
  'heise.de':'https://www.heise.de/rss/heise-atom.xml',
  'golem.de':'https://rss.golem.de/rss.php?feed=RSS2.0',
  't3n.de':'https://t3n.de/rss.xml',
  'chip.de':'https://www.chip.de/rss/chip-online.xml',
  'netzwelt.de':'https://www.netzwelt.de/rss/index.xml',
  'netzpolitik.org':'https://netzpolitik.org/feed/',
  'sport1.de':'https://www.sport1.de/rss/allenews.xml',
  'kicker.de':'https://rss.kicker.de/news/aktuell',
  'der-postillon.com':'https://feeds.feedburner.com/blogspot/rkEL',
  'postillon.com':'https://feeds.feedburner.com/blogspot/rkEL',
  'titanic-magazin.de':'https://www.titanic-magazin.de/feeds/rss/',
  'spektrum.de':'https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406',
  'nzz.ch':'https://www.nzz.ch/recent.rss',
  'derstandard.at':'https://www.derstandard.at/rss',
  'bbc.com':'https://feeds.bbci.co.uk/news/rss.xml',
  'bbc.co.uk':'https://feeds.bbci.co.uk/news/rss.xml',
  'theguardian.com':'https://www.theguardian.com/world/rss',
  'nytimes.com':'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'cnn.com':'https://rss.cnn.com/rss/edition.rss',
  'reuters.com':'https://www.reutersagency.com/feed/',
  'dw.com':'https://rss.dw.com/rdf/rss-de-all',
  'techcrunch.com':'https://techcrunch.com/feed/',
  'theverge.com':'https://www.theverge.com/rss/index.xml',
  'arstechnica.com':'https://feeds.arstechnica.com/arstechnica/index',
  'washingtonpost.com':'https://feeds.washingtonpost.com/rss/homepage',
  'blick.ch':'https://www.blick.ch/rss.xml',
  'kurier.at':'https://kurier.at/xml/rssd',
  'auto-motor-und-sport.de':'https://www.auto-motor-und-sport.de/feed/',
  'gala.de':'https://www.gala.de/feed/rss',
  'geo.de':'https://www.geo.de/feed/rss',
};

const PAYWALL_PATTERNS = /\b(S\+|A\+|Z\+|F\+|SZ[\s-]*Plus|SPIEGEL[\s-]*\+|SPIEGEL\s*Plus|ZEIT\+|BILDplus|WELTplus|FAZ\+|Handelsblatt[\s-]*Premium)\b/i;

function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } }

function findFeed(url) {
  const d = getDomain(url);
  if (FEEDS[d]) return FEEDS[d];
  for (const [k, v] of Object.entries(FEEDS)) { if (d.endsWith(k) || k.endsWith(d)) return v; }
  return null;
}

function isPaywall(item, domain) {
  const all = `${item.title || ''} ${item.contentSnippet || ''} ${(item.categories || []).join(' ')}`;
  const link = item.link || '';
  if (PAYWALL_PATTERNS.test(all)) return true;
  if (/\/(plus|premium)\//i.test(link)) return true;
  if (domain.includes('spiegel.de') && (/spiegel\s*\+|S\+/i.test(all) || link.includes('-plus-'))) return true;
  if (domain.includes('abendblatt.de') && /A\+|Abendblatt\s*Plus/i.test(all)) return true;
  if (domain.includes('zeit.de') && /Z\+|ZEIT\s*\+/i.test(all)) return true;
  if (domain.includes('faz.net') && /F\+|FAZ\s*\+/i.test(all)) return true;
  return false;
}

function isToday(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function extractImage(item) {
  // media:content / media:thumbnail
  if (item.media?.$?.url) return item.media.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  // enclosure (image type)
  if (item.enclosure?.url && (item.enclosure?.type || '').startsWith('image')) return item.enclosure.url;
  // Postillon & others: look in content:encoded first (has full HTML with <img>)
  const encoded = item.contentEncoded || item['content:encoded'] || '';
  if (encoded) {
    const m = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && !/1x1|pixel|tracking|logo/i.test(m[1])) return m[1];
  }
  // Fallback: content field
  const content = item.content || '';
  if (content) {
    const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && !/1x1|pixel|tracking|logo/i.test(m[1])) return m[1];
  }
  return null;
}

function cleanSummary(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350);
}

async function fetchRSS(feedUrl, sourceUrl) {
  const feed = await parser.parseURL(feedUrl);
  const d = getDomain(sourceUrl);
  return (feed.items || [])
    .filter((item) => isToday(item.pubDate || item.isoDate))
    .slice(0, 25)
    .map((item) => ({
      title: item.title || 'Ohne Titel',
      summary: cleanSummary(item.contentSnippet || item.content || item.description || ''),
      url: item.link || item.guid || sourceUrl,
      paywall: isPaywall(item, d),
      pubDate: item.pubDate || item.isoDate || null,
      image: extractImage(item),
    }));
}

async function discoverFeed(url) {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Pressespiegel/2.0' }, signal: AbortSignal.timeout(8000) });
    const html = await resp.text();
    const m = html.match(/<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(rss|atom)\+xml["']/i);
    if (m) { try { return new URL(m[2] || m[1], url).href; } catch { return m[2] || m[1]; } }
  } catch {}
  const base = new URL(url).origin;
  for (const p of ['/rss', '/feed', '/rss.xml', '/feed.xml', '/atom.xml']) {
    try { const r = await fetch(base + p, { method: 'HEAD', signal: AbortSignal.timeout(3000) }); if (r.ok && (r.headers.get('content-type') || '').match(/xml|rss|atom/i)) return base + p; } catch {}
  }
  return null;
}

export async function POST(request) {
  const { sourceUrl, sourceName } = await request.json();
  try {
    let feedUrl = findFeed(sourceUrl);
    if (feedUrl) {
      try {
        const a = await fetchRSS(feedUrl, sourceUrl);
        // Return even if 0 articles today - not an error
        return Response.json({ articles: a, source: 'rss', feedUrl });
      } catch {}
    }
    const discovered = await discoverFeed(sourceUrl);
    if (discovered) {
      try { const a = await fetchRSS(discovered, sourceUrl); return Response.json({ articles: a, source: 'rss-discovered', feedUrl: discovered }); } catch {}
    }
    const d = getDomain(sourceUrl);
    for (const p of ['/rss', '/feed', '/rss.xml', '/feed.xml']) {
      try { const a = await fetchRSS(`https://www.${d}${p}`, sourceUrl); if (a.length > 0) return Response.json({ articles: a, source: 'rss-guessed' }); } catch {}
    }
    return Response.json({ error: 'Kein RSS-Feed gefunden.' }, { status: 404 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
