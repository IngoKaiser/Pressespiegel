import Parser from 'rss-parser';

const parser = new Parser({ timeout: 12000, headers: { 'User-Agent': 'Pressespiegel/2.0' } });

// ─── 100+ Verified RSS Feeds ───
const FEEDS = {
  // === NACHRICHTEN (Top) ===
  'spiegel.de':         'https://www.spiegel.de/schlagzeilen/index.rss',
  'faz.net':            'https://www.faz.net/rss/aktuell/',
  'zeit.de':            'https://newsfeed.zeit.de/index',
  'sueddeutsche.de':    'https://rss.sueddeutsche.de/rss/Topthemen',
  'tagesschau.de':      'https://www.tagesschau.de/index~rss2.xml',
  'welt.de':            'https://www.welt.de/feeds/latest.rss',
  'n-tv.de':            'https://www.n-tv.de/rss',
  'stern.de':           'https://www.stern.de/feed/standard/all/',
  'focus.de':           'https://rss.focus.de/fol/XML/rss_folnews.xml',
  'tagesspiegel.de':    'https://www.tagesspiegel.de/contentexport/feed/home',
  'rp-online.de':       'https://rp-online.de/feed.rss',
  'rnd.de':             'https://www.rnd.de/arc/outboundfeeds/rss/',
  'merkur.de':          'https://www.merkur.de/welt/rssfeed.rdf',
  'fr.de':              'https://www.fr.de/rssfeed.rdf',
  'hna.de':             'https://www.hna.de/rssfeed.rdf',
  'tz.de':              'https://www.tz.de/rssfeed.rdf',
  'news.de':            'https://www.news.de/rss/politik/',
  'web.de':             'https://web.de/feeds/rss/',

  // === ÖFFENTLICH-RECHTLICH ===
  'zdf.de':             'https://www.zdf.de/rss/zdf/nachrichten',
  'ard.de':             'https://www.tagesschau.de/index~rss2.xml',
  'deutschlandfunk.de': 'https://www.deutschlandfunk.de/nachrichten-100.rss',
  'br.de':              'https://www.br.de/nachrichten/feed/',
  'ndr.de':             'https://www.ndr.de/nachrichten/index-rss.xml',
  'mdr.de':             'https://www.mdr.de/nachrichten/index-rss.xml',
  'wdr.de':             'https://www1.wdr.de/uebersicht-nachrichten-100.feed',
  'swr.de':             'https://www.swr.de/~rss/swraktuell-100.xml',
  'hr.de':              'https://www.hr-inforadio.de/nachrichten/index.rss',
  'sportschau.de':      'https://www.sportschau.de/index~rss2.xml',

  // === WIRTSCHAFT & FINANZEN ===
  'handelsblatt.com':   'https://www.handelsblatt.com/contentexport/feed/top-themen/',
  'manager-magazin.de': 'https://www.manager-magazin.de/schlagzeilen/index.rss',
  'wiwo.de':            'https://www.wiwo.de/contentexport/feed/rss/schlagzeilen',
  'capital.de':         'https://www.capital.de/feed/rss',
  'finanzen.net':       'https://www.finanzen.net/rss/news',
  'wallstreet-online.de':'https://www.wallstreet-online.de/rss/nachrichten.xml',
  'aktionaer.de':       'https://www.deraktionaer.de/rss/alle-artikel.xml',
  'boerse-online.de':   'https://www.boerse-online.de/rss/news',

  // === REGIONAL ===
  'abendblatt.de':      'https://www.abendblatt.de/rss',
  'morgenpost.de':      'https://www.morgenpost.de/rss',
  'bz-berlin.de':       'https://www.bz-berlin.de/feed',
  'mopo.de':            'https://www.mopo.de/feed/',
  'stuttgarter-zeitung.de': 'https://www.stuttgarter-zeitung.de/feed/rss',
  'stuttgarter-nachrichten.de': 'https://www.stuttgarter-nachrichten.de/feed/rss',
  'ksta.de':            'https://www.ksta.de/feed/index.rss',
  'express.de':         'https://www.express.de/feed/index.rss',
  'rheinpfalz.de':      'https://www.rheinpfalz.de/feed/',
  'weser-kurier.de':    'https://www.weser-kurier.de/rss/feed/',

  // === TECH ===
  'heise.de':           'https://www.heise.de/rss/heise-atom.xml',
  'golem.de':           'https://rss.golem.de/rss.php?feed=RSS2.0',
  't3n.de':             'https://t3n.de/rss.xml',
  'chip.de':            'https://www.chip.de/rss/chip-online.xml',
  'computerbild.de':    'https://www.computerbild.de/rssfeed_2261.xml',
  'winfuture.de':       'https://static.winfuture.de/feeds/WinFuture-News-rss2.0.xml',
  'netzwelt.de':        'https://www.netzwelt.de/rss/index.xml',
  'pcwelt.de':          'https://www.pcwelt.de/feed/',
  'macerkopf.de':       'https://www.macerkopf.de/feed/',
  'netzpolitik.org':    'https://netzpolitik.org/feed/',
  'caschys.blog':       'https://stadt-bremerhaven.de/feed/',

  // === SPORT ===
  'sport1.de':          'https://www.sport1.de/rss/allenews.xml',
  'kicker.de':          'https://rss.kicker.de/news/aktuell',
  'spox.com':           'https://www.spox.com/feeds/schlagzeilen.rss',
  'sportbild.de':       'https://sportbild.bild.de/rss/vw-alle-artikel/vw-alle-artikel-37498182,view=rss2.sport.xml',
  'transfermarkt.de':   'https://www.transfermarkt.de/rss/news',
  'auto-motor-und-sport.de': 'https://www.auto-motor-und-sport.de/feed/',
  'formel1.de':         'https://www.formel1.de/rss.xml',

  // === UNTERHALTUNG & SATIRE ===
  'der-postillon.com':  'https://feeds.feedburner.com/blogspot/rkEL',
  'postillon.com':      'https://feeds.feedburner.com/blogspot/rkEL',
  'titanic-magazin.de': 'https://www.titanic-magazin.de/feeds/rss/',
  'gala.de':            'https://www.gala.de/feed/rss',
  'promiflash.de':      'https://www.promiflash.de/rss.xml',
  'moviepilot.de':      'https://www.moviepilot.de/feed',

  // === WISSENSCHAFT ===
  'spektrum.de':        'https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406',
  'scinexx.de':         'https://www.scinexx.de/feed/',
  'wissenschaft.de':    'https://www.wissenschaft.de/feed/',

  // === DACH (AT/CH) ===
  'nzz.ch':             'https://www.nzz.ch/recent.rss',
  'derstandard.at':     'https://www.derstandard.at/rss',
  'kurier.at':          'https://kurier.at/xml/rssd',
  'krone.at':           'https://www.krone.at/nachrichten/rss.html',
  'blick.ch':           'https://www.blick.ch/rss.xml',
  'tagesanzeiger.ch':   'https://www.tagesanzeiger.ch/rss.html',
  '20min.ch':           'https://www.20min.ch/rss/rss.tmpl?type=channel&get=1',
  'watson.ch':          'https://www.watson.ch/api/1.0/rss/index.xml',

  // === INTERNATIONAL ===
  'bbc.com':            'https://feeds.bbci.co.uk/news/rss.xml',
  'bbc.co.uk':          'https://feeds.bbci.co.uk/news/rss.xml',
  'theguardian.com':    'https://www.theguardian.com/world/rss',
  'nytimes.com':        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  'washingtonpost.com': 'https://feeds.washingtonpost.com/rss/homepage',
  'cnn.com':            'https://rss.cnn.com/rss/edition.rss',
  'reuters.com':        'https://www.reutersagency.com/feed/',
  'aljazeera.com':      'https://www.aljazeera.com/xml/rss/all.xml',
  'france24.com':       'https://www.france24.com/en/rss',
  'dw.com':             'https://rss.dw.com/rdf/rss-de-all',
  'euronews.com':       'https://www.euronews.com/rss',
  'politico.eu':        'https://www.politico.eu/feed/',
  'techcrunch.com':     'https://techcrunch.com/feed/',
  'theverge.com':       'https://www.theverge.com/rss/index.xml',
  'arstechnica.com':    'https://feeds.arstechnica.com/arstechnica/index',
  'wired.com':          'https://www.wired.com/feed/rss',

  // === LIFESTYLE / REISE ===
  'geo.de':             'https://www.geo.de/feed/rss',
  'fitforfun.de':       'https://www.fitforfun.de/rss',
  'urlaubspiraten.de':  'https://www.urlaubspiraten.de/feed/',
};

const PAYWALL_PATTERNS = /\b(S\+|A\+|Z\+|F\+|SZ[\s-]*Plus|SPIEGEL[\s-]*Plus|SPIEGEL\+|ZEIT\+|BILDplus|Premium|Exklusiv|Abo[\s-]*nötig|Subscriber|Bezahlinhalt|WELTplus|FAZplus|Handelsblatt[\s-]*Premium)\b/i;
const PAYWALL_URL_PATTERNS = /\/(plus|premium)\b/i;
const PAYWALL_DOMAINS = ['spiegel.de','zeit.de','faz.net','sueddeutsche.de','welt.de','handelsblatt.com','nzz.ch','abendblatt.de','morgenpost.de','wiwo.de','manager-magazin.de','tagesspiegel.de','stuttgarter-zeitung.de','ksta.de','tagesanzeiger.ch','stern.de'];

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function findFeed(url) {
  const d = getDomain(url);
  if (FEEDS[d]) return FEEDS[d];
  for (const [k, v] of Object.entries(FEEDS)) {
    if (d.endsWith(k) || k.endsWith(d)) return v;
  }
  return null;
}

function isPaywall(item, domain) {
  const title = item.title || '';
  const text = `${title} ${item.contentSnippet || ''} ${item.content || ''}`;
  const link = item.link || item.guid || '';
  const categories = (item.categories || []).join(' ');

  // Explicit paywall markers in text
  if (PAYWALL_PATTERNS.test(text)) return true;
  if (PAYWALL_PATTERNS.test(categories)) return true;

  // URL-based detection (e.g. /plus/ in URL)
  if (PAYWALL_URL_PATTERNS.test(link)) return true;

  // Spiegel: S+ articles have "SPIEGEL+" or category "SPIEGEL+"
  if (domain.includes('spiegel.de')) {
    if (/spiegel\s*\+|S\+/i.test(text + ' ' + categories)) return true;
    if (link.includes('-plus-') || /\/plus\//i.test(link)) return true;
  }

  // Abendblatt: A+ articles
  if (domain.includes('abendblatt.de')) {
    if (/A\+|Abendblatt\s*Plus/i.test(text + ' ' + categories)) return true;
  }

  // Zeit: Z+ articles
  if (domain.includes('zeit.de')) {
    if (/Z\+|ZEIT\+|zeit\s*plus/i.test(text + ' ' + categories)) return true;
  }

  // FAZ: F+ articles
  if (domain.includes('faz.net')) {
    if (/F\+|FAZ\+|faz\s*plus/i.test(text + ' ' + categories)) return true;
  }

  // Generic check for known paywall domains - "plus" or "premium" in text/categories
  if (PAYWALL_DOMAINS.some((d) => domain.includes(d))) {
    if (/\bplus\b|\bpremium\b|\bexklusiv\b/i.test(text + ' ' + categories)) return true;
  }

  return false;
}

async function fetchRSS(feedUrl, sourceUrl) {
  const feed = await parser.parseURL(feedUrl);
  const d = getDomain(sourceUrl);
  return (feed.items || []).slice(0, 15).map((item) => ({
    title: item.title || 'Ohne Titel',
    summary: (item.contentSnippet || item.content?.replace(/<[^>]*>/g, '') || '').slice(0, 250),
    url: item.link || item.guid || sourceUrl,
    paywall: isPaywall(item, d),
    pubDate: item.pubDate || item.isoDate || null,
  }));
}

async function discoverFeed(url) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Pressespiegel/2.0' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await resp.text();
    const match = html.match(/<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(rss|atom)\+xml["']/i);
    if (match) {
      const feedUrl = match[2] || match[1];
      try { return new URL(feedUrl, url).href; } catch { return feedUrl; }
    }
  } catch {}
  const base = new URL(url).origin;
  for (const p of ['/rss', '/feed', '/rss.xml', '/feed.xml', '/atom.xml', '/index.rss', '/feed/rss']) {
    try {
      const r = await fetch(base + p, { method: 'HEAD', signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'Pressespiegel/2.0' } });
      if (r.ok && (r.headers.get('content-type') || '').match(/xml|rss|atom/i)) return base + p;
    } catch {}
  }
  return null;
}

export async function POST(request) {
  const { sourceUrl, sourceName } = await request.json();

  try {
    // 1. Known feed
    let feedUrl = findFeed(sourceUrl);
    if (feedUrl) {
      try {
        const articles = await fetchRSS(feedUrl, sourceUrl);
        if (articles.length > 0) return Response.json({ articles, source: 'rss', feedUrl });
      } catch {}
    }

    // 2. Auto-discover
    const discovered = await discoverFeed(sourceUrl);
    if (discovered) {
      try {
        const articles = await fetchRSS(discovered, sourceUrl);
        if (articles.length > 0) return Response.json({ articles, source: 'rss-discovered', feedUrl: discovered });
      } catch {}
    }

    // 3. Common paths
    const d = getDomain(sourceUrl);
    for (const p of ['/rss', '/feed', '/rss.xml', '/feed.xml']) {
      try {
        const tryUrl = `https://www.${d}${p}`;
        const articles = await fetchRSS(tryUrl, sourceUrl);
        if (articles.length > 0) return Response.json({ articles, source: 'rss-guessed', feedUrl: tryUrl });
      } catch {}
    }

    // 4. API fallback
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Kein RSS-Feed gefunden und kein API-Key konfiguriert.' }, { status: 500 });
    }
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 2048,
        system: 'Antworte NUR mit JSON-Array. Kein Text.',
        messages: [{ role: 'user', content: `Schlagzeilen von ${sourceName} (${sourceUrl}). JSON: [{"title":"...","summary":"...","url":"...","paywall":false}]` }],
      }),
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const data = await resp.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const arr = JSON.parse(cleaned.match(/\[[\s\S]*\]/)?.[0] || cleaned);
    if (Array.isArray(arr)) return Response.json({ articles: arr, source: 'api' });
    throw new Error('Parse failed');
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
