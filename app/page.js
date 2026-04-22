'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SK = 'ps-src-v5', CK = 'ps-cache-v5', LK = 'ps-lang', TK = 'ps-trans', BK = 'ps-broken', TTL = 20 * 60 * 1000;
const uid = () => Math.random().toString(36).slice(2, 9);
const dom = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return u; } };
const norm = (u) => u.startsWith('http') ? u : 'https://' + u;
const fav = (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;

const IconExternal = () => (<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4"/><path d="M9 2h5v5"/><path d="M6 10L14 2"/></svg>);
const IconGear = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="10" cy="10" r="3"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2m-3.5-6.5l-1.4 1.4M6.9 13.1l-1.4 1.4m0-11l1.4 1.4m7.2 7.2l1.4 1.4"/></svg>);
const IconDrag = () => (<svg width="14" height="14" viewBox="0 0 16 16" fill="#bbb"><circle cx="5" cy="3" r="1.3"/><circle cx="11" cy="3" r="1.3"/><circle cx="5" cy="8" r="1.3"/><circle cx="11" cy="8" r="1.3"/><circle cx="5" cy="13" r="1.3"/><circle cx="11" cy="13" r="1.3"/></svg>);

const LANG_LABELS = { off: 'Standard', einfach: 'Einfach', jugend: 'Jugendsprache' };
const LANG_COLORS = { off: null, einfach: { bg: '#f0f5ff', border: '#bfdbfe', text: '#1d4ed8' }, jugend: { bg: '#fdf4ff', border: '#e9d5ff', text: '#7c3aed' } };

// ─── Translation helper ───
async function translateText(mode, type, text) {
  const r = await fetch('/api/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, type, text }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.result;
}

// ─── Card ───
function FeedCard({ article, langMode, transCache, onClick }) {
  const [h, setH] = useState(false);
  const hasImg = !!article.image;
  const cacheKey = `${article.url}:${langMode}`;
  const cached = transCache[cacheKey];
  const title = langMode !== 'off' && cached?.title ? cached.title : article.title;
  const summary = langMode !== 'off' && cached?.summary ? cached.summary : article.summary;

  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      cursor: 'pointer', display: 'flex', flexDirection: hasImg ? 'column' : 'row',
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      border: h ? '1px solid #bbb' : '1px solid #e8e5e0',
      transition: 'all 0.2s ease', transform: h ? 'translateY(-1px)' : 'none',
      boxShadow: h ? '0 4px 16px rgba(0,0,0,0.06)' : 'none', height: '100%',
    }}>
      {hasImg && <div style={{ height: 'clamp(140px, 25vw, 200px)', backgroundImage: `url(${article.image})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />}
      <div style={{ padding: 'clamp(14px, 3vw, 20px)', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#999' }}>
          <img src={fav(dom(article.sourceUrl))} alt="" width={12} height={12} style={{ borderRadius: 2, opacity: 0.7 }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span>{article.sourceName}</span>
          {article.pubDate && <><span style={{ opacity: 0.4 }}>|</span><span>{new Date(article.pubDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span></>}
        </div>
        <h3 style={{ margin: 0, fontSize: 'clamp(15px, 2.5vw, 17px)', fontWeight: 700, lineHeight: 1.3, fontFamily: "'Libre Baskerville', serif", color: '#111', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</h3>
        {summary && <p style={{ margin: 0, fontSize: 'clamp(13px, 2vw, 14px)', lineHeight: 1.55, color: '#666', display: '-webkit-box', WebkitLineClamp: hasImg ? 3 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{summary}</p>}
      </div>
    </div>
  );
}

// ─── Reader ───
function Reader({ article, langMode, transCache, onBack, onMarkBroken, onCacheTrans }) {
  const [content, setContent] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transContent, setTransContent] = useState(null);
  const [transLoading, setTransLoading] = useState(false);
  const [showOrig, setShowOrig] = useState(false);

  const cacheKey = `${article.url}:${langMode}`;
  const cached = transCache[cacheKey];
  const colors = LANG_COLORS[langMode];

  // Fetch article content
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/article', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: article.url, title: article.title }) });
        const d = await r.json();
        if (!c) {
          if (d.images) setImages(d.images);
          if (d.error) setError(d.error);
          else if (d.content === 'PAYWALL' || d.content === 'NOT_EXTRACTABLE') {
            onMarkBroken(article.id);
            setError(d.content === 'PAYWALL' ? 'paywall' : 'not_extractable');
          } else setContent(d.content);
          setLoading(false);
        }
      } catch (e) { if (!c) { setError(e.message); setLoading(false); } }
    })();
    return () => { c = true; };
  }, [article]);

  // Translate full article when content is loaded and langMode is active
  useEffect(() => {
    if (!content || langMode === 'off') return;
    if (cached?.fullText) { setTransContent(cached.fullText); return; }
    let c = false;
    setTransLoading(true);
    (async () => {
      try {
        const result = await translateText(langMode, 'article', content);
        if (!c) {
          setTransContent(result);
          onCacheTrans(cacheKey, { ...cached, fullText: result });
        }
      } catch {}
      if (!c) setTransLoading(false);
    })();
    return () => { c = true; };
  }, [content, langMode]);

  const displayTitle = langMode !== 'off' && cached?.title && !showOrig ? cached.title : article.title;
  const displaySummary = langMode !== 'off' && cached?.summary && !showOrig ? cached.summary : article.summary;
  const displayContent = showOrig ? content : (langMode !== 'off' && transContent ? transContent : content);
  const heroImage = article.image || images[0];

  return (
    <div style={{ minHeight: '100dvh', background: '#faf9f7' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px clamp(16px, 4vw, 32px)', background: 'rgba(250,249,247,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #eae7e2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 600, letterSpacing: 0.3, padding: 0 }}>&larr; ZUR&Uuml;CK</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {langMode !== 'off' && colors && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>{LANG_LABELS[langMode]}</span>}
          <img src={fav(dom(article.sourceUrl))} alt="" width={14} height={14} style={{ borderRadius: 3, opacity: 0.6 }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{article.sourceName}</span>
          <a href={article.url} target="_blank" rel="noopener noreferrer" title="Originalseite" style={{ color: '#bbb', display: 'flex', marginLeft: 2 }}><IconExternal /></a>
        </div>
      </div>

      {heroImage && <div style={{ width: '100%', height: 'clamp(200px, 35vw, 360px)', backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)' }}>
        {langMode !== 'off' && content && (
          <button onClick={() => setShowOrig(!showOrig)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '6px 12px', borderRadius: 6, fontSize: 12, background: showOrig ? '#f5f5f5' : colors?.bg, color: showOrig ? '#999' : colors?.text, border: `1px solid ${showOrig ? '#ddd' : colors?.border}`, cursor: 'pointer', fontWeight: 500 }}>
            {showOrig ? 'Vereinfacht anzeigen' : 'Original anzeigen'}
          </button>
        )}

        {article.pubDate && <div style={{ fontSize: 12, color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>{new Date(article.pubDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>}
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, lineHeight: 1.18, fontFamily: "'Libre Baskerville', serif", color: '#111', marginBottom: 16 }}>{displayTitle}</h1>
        {displaySummary && <p style={{ fontSize: 'clamp(15px, 2.3vw, 18px)', lineHeight: 1.6, color: '#666', fontStyle: 'italic', marginBottom: 28 }}>{displaySummary}</p>}
        <div style={{ width: 32, height: 1, background: '#ddd', marginBottom: 28 }} />

        {loading && <div style={{ padding: '48px 0', textAlign: 'center', color: '#bbb', fontSize: 14, animation: 'pulse 1.5s ease-in-out infinite' }}>Wird geladen ...</div>}
        {transLoading && !loading && <div style={{ padding: '12px 0', textAlign: 'center', color: colors?.text || '#999', fontSize: 12, animation: 'pulse 1s ease-in-out infinite' }}>Wird {langMode === 'jugend' ? 'in Jugendsprache' : 'vereinfacht'} ...</div>}

        {error && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
              {error === 'paywall' && <><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, color: '#c0392b', fontWeight: 600 }}>Bezahlinhalt</div>Dieser Artikel erfordert ein Abonnement.</>}
              {error === 'not_extractable' && 'Artikelinhalt konnte nicht geladen werden.'}
              {error !== 'paywall' && error !== 'not_extractable' && error}
            </div>
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', color: '#555', textDecoration: 'none', fontSize: 13 }}>Originalseite <IconExternal /></a>
          </div>
        )}

        {displayContent && !loading && <div style={{ fontSize: 'clamp(15px, 2.3vw, 17px)', lineHeight: 1.85, color: '#333', whiteSpace: 'pre-wrap', fontFamily: "'Libre Baskerville', serif" }}>{displayContent}</div>}
      </div>
    </div>
  );
}

// ─── Add Source Modal ───
function Modal({ onAdd, onClose }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const ref = useRef(null);
  useEffect(() => { document.body.style.overflow = 'hidden'; ref.current?.focus(); return () => { document.body.style.overflow = ''; }; }, []);
  const submit = () => { if (!url.trim()) return; const n = norm(url.trim()); onAdd({ id: uid(), url: n, name: name.trim() || dom(n) }); };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#faf9f7', borderRadius: 16, padding: 'clamp(24px, 5vw, 36px)', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 18, fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>Quelle hinzuf&uuml;gen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>URL</label>
            <input ref={ref} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="spiegel.de" onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ width: '100%', padding: '14px 0', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', color: '#111', fontSize: 17, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>NAME (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Der Spiegel" onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ width: '100%', padding: '14px 0', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', color: '#111', fontSize: 17, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={submit} style={{ flex: 1, padding: '13px 0', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: url.trim() ? 1 : 0.3 }}>Hinzuf&uuml;gen</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Drawer (language only) ───
function SettingsDrawer({ langMode, onLangChange, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#faf9f7', width: 'min(300px, 85vw)', height: '100%', padding: '28px 22px', boxShadow: '-8px 0 40px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Libre Baskerville', serif" }}>Einstellungen</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1 }}>x</button>
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: '#999', marginBottom: 14 }}>Lesemodus</div>
        {['off', 'einfach', 'jugend'].map((mode) => {
          const active = langMode === mode;
          const c = LANG_COLORS[mode];
          return (
            <button key={mode} onClick={() => onLangChange(mode)} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '14px 14px', marginBottom: 4, borderRadius: 10, background: active ? (c?.bg || '#f5f5f5') : 'transparent', border: active ? `1.5px solid ${c?.border || '#ddd'}` : '1px solid transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? (c?.text || '#111') : '#555' }}>
                  {mode === 'off' ? 'Standard' : mode === 'einfach' ? 'Einfache Sprache' : 'Jugendsprache'}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {mode === 'off' ? 'Originaltexte' : mode === 'einfach' ? 'Klar und verst\u00e4ndlich (12\u201314 J.)' : 'Lockerer Ton, zeitgem\u00e4\u00dfer Slang'}
                </div>
              </div>
              {active && <div style={{ width: 8, height: 8, borderRadius: 4, background: c?.text || '#111', flexShrink: 0, marginLeft: 10 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sources Drawer (drag reorder) ───
function SourcesDrawer({ sources, onReorder, onRemove, onClose }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [touchDrag, setTouchDrag] = useState(null);
  const listRef = useRef(null);

  const onDragStart = (e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const onDragEnd = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...sources]; const [item] = next.splice(dragIdx, 1); next.splice(overIdx, 0, item); onReorder(next);
    }
    setDragIdx(null); setOverIdx(null);
  };
  const onTouchStartDrag = (i, e) => { e.preventDefault(); setTouchDrag({ idx: i, currentIdx: i }); };
  const onTouchMoveDrag = (e) => {
    if (!touchDrag) return;
    const touch = e.touches[0];
    const items = listRef.current?.querySelectorAll('[data-src-item]');
    if (!items) return;
    for (let j = 0; j < items.length; j++) {
      const rect = items[j].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) { setTouchDrag((p) => ({ ...p, currentIdx: j })); break; }
    }
  };
  const onTouchEndDrag = () => {
    if (touchDrag && touchDrag.idx !== touchDrag.currentIdx) {
      const next = [...sources]; const [item] = next.splice(touchDrag.idx, 1); next.splice(touchDrag.currentIdx, 0, item); onReorder(next);
    }
    setTouchDrag(null);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#faf9f7', width: 'min(320px, 88vw)', height: '100%', padding: '28px 22px', boxShadow: '-8px 0 40px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Libre Baskerville', serif" }}>Quellen</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', lineHeight: 1 }}>x</button>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>Reihenfolge per Drag &amp; Drop &auml;ndern</div>
        <div ref={listRef} onTouchMove={onTouchMoveDrag} onTouchEnd={onTouchEndDrag}>
          {sources.map((s, i) => {
            const isDragging = dragIdx === i || touchDrag?.idx === i;
            const isOver = overIdx === i || (touchDrag?.currentIdx === i && touchDrag?.idx !== i);
            return (
              <div key={s.id} data-src-item draggable onDragStart={(e) => onDragStart(e, i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={onDragEnd}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 8px', marginBottom: 2, borderRadius: 8, background: isDragging ? '#f0f0ee' : isOver ? '#e8f4fe' : 'transparent', borderTop: isOver ? '2px solid #3b82f6' : '2px solid transparent', opacity: isDragging ? 0.5 : 1, cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none' }}>
                <div onTouchStart={(e) => onTouchStartDrag(i, e)} style={{ cursor: 'grab', touchAction: 'none', padding: '4px 2px', flexShrink: 0, userSelect: 'none', WebkitUserSelect: 'none' }}><IconDrag /></div>
                <img src={fav(dom(s.url))} alt="" width={16} height={16} style={{ borderRadius: 3, flexShrink: 0, pointerEvents: 'none' }} onError={(e) => { e.target.style.display = 'none'; }} />
                <span style={{ fontSize: 14, flex: 1, pointerEvents: 'none' }}>{s.name}</span>
                <button onClick={(e) => { e.stopPropagation(); onRemove(s.id); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#c0392b', cursor: 'pointer', fontWeight: 600, padding: '4px 8px', flexShrink: 0 }}>Entfernen</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function Home() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState({});
  const [brokenIds, setBrokenIds] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [langMode, setLangMode] = useState('off');
  const [transCache, setTransCache] = useState({});
  const [modal, setModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [reader, setReader] = useState(null);
  const [ready, setReady] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [pullState, setPullState] = useState('idle');
  const [transProgress, setTransProgress] = useState(false);
  const contentRef = useRef(null);
  const proc = useRef(false);
  const touchStart = useRef(0);

  // Load state
  useEffect(() => {
    try { const s = localStorage.getItem(SK); if (s) setSources(JSON.parse(s)); } catch {}
    try { const c = localStorage.getItem(CK); if (c) { const { d, t } = JSON.parse(c); if (Date.now() - t < TTL) setArticles(d); } } catch {}
    try { const b = localStorage.getItem(BK); if (b) setBrokenIds(new Set(JSON.parse(b))); } catch {}
    try { const l = localStorage.getItem(LK); if (l) setLangMode(l); } catch {}
    try { const t = localStorage.getItem(TK); if (t) setTransCache(JSON.parse(t)); } catch {}
    setReady(true);
  }, []);

  // Save state
  useEffect(() => { if (ready) try { localStorage.setItem(SK, JSON.stringify(sources)); } catch {} }, [sources, ready]);
  useEffect(() => { if (ready && Object.keys(articles).length) try { localStorage.setItem(CK, JSON.stringify({ d: articles, t: Date.now() })); } catch {} }, [articles, ready]);
  useEffect(() => { if (brokenIds.size > 0) try { localStorage.setItem(BK, JSON.stringify([...brokenIds])); } catch {} }, [brokenIds]);
  useEffect(() => { if (ready) try { localStorage.setItem(LK, langMode); } catch {} }, [langMode, ready]);
  useEffect(() => { if (Object.keys(transCache).length) try { localStorage.setItem(TK, JSON.stringify(transCache)); } catch {} }, [transCache]);

  // Auto-dismiss errors
  useEffect(() => {
    const ids = Object.keys(errors).filter(k => errors[k]);
    if (!ids.length) return;
    const t = setTimeout(() => setErrors(p => { const n = { ...p }; ids.forEach(id => delete n[id]); return n; }), 5000);
    return () => clearTimeout(t);
  }, [errors]);

  // Translate titles/summaries when langMode changes
  useEffect(() => {
    if (langMode === 'off' || !ready) return;
    const allArts = Object.values(articles).flat().filter(a => !a.paywall);
    const untranslated = allArts.filter(a => !transCache[`${a.url}:${langMode}`]?.title);
    if (!untranslated.length) return;
    let cancelled = false;
    setTransProgress(true);
    (async () => {
      for (const a of untranslated.slice(0, 15)) {
        if (cancelled) break;
        try {
          const [title, summary] = await Promise.all([
            translateText(langMode, 'title', a.title),
            a.summary ? translateText(langMode, 'summary', a.summary) : Promise.resolve(''),
          ]);
          if (!cancelled) {
            const key = `${a.url}:${langMode}`;
            setTransCache(p => ({ ...p, [key]: { ...p[key], title, summary } }));
          }
        } catch { break; } // Stop on rate limit
      }
      if (!cancelled) setTransProgress(false);
    })();
    return () => { cancelled = true; };
  }, [langMode, articles, ready]);

  const cacheTrans = useCallback((key, data) => setTransCache(p => ({ ...p, [key]: data })), []);

  // Load articles
  const load = useCallback(async (q) => {
    if (proc.current || !q.length) return;
    proc.current = true;
    for (const src of q) {
      setLoading(p => ({ ...p, [src.id]: true }));
      setErrors(p => ({ ...p, [src.id]: null }));
      try {
        const r = await fetch('/api/headlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl: src.url, sourceName: src.name }) });
        const d = await r.json();
        if (d.error) { setErrors(p => ({ ...p, [src.id]: d.error })); setArticles(p => ({ ...p, [src.id]: [] })); }
        else { setArticles(p => ({ ...p, [src.id]: (d.articles || []).map(a => ({ ...a, id: uid(), sourceId: src.id, sourceName: src.name, sourceUrl: src.url })) })); }
      } catch (e) { setErrors(p => ({ ...p, [src.id]: e.message })); setArticles(p => ({ ...p, [src.id]: [] })); }
      setLoading(p => ({ ...p, [src.id]: false }));
      if (q.indexOf(src) < q.length - 1) await new Promise(r => setTimeout(r, 300));
    }
    proc.current = false;
  }, []);

  useEffect(() => { if (!ready) return; const t = sources.filter(s => !articles[s.id] && !loading[s.id]); if (t.length) load(t); }, [sources, ready, articles]);

  // Pull-to-refresh
  const onTS = (e) => { if (contentRef.current?.scrollTop === 0) touchStart.current = e.touches[0].clientY; else touchStart.current = 0; };
  const onTM = (e) => { if (touchStart.current && e.touches[0].clientY - touchStart.current > 60 && pullState === 'idle') setPullState('pulling'); };
  const onTE = () => { if (pullState === 'pulling') { setPullState('refreshing'); setArticles({}); setErrors({}); setBrokenIds(new Set()); localStorage.removeItem(BK); load([...sources]).then(() => setPullState('idle')); } touchStart.current = 0; };

  const add = (s) => { setSources(p => [...p, s]); setModal(false); };
  const remove = (id) => { setSources(p => p.filter(s => s.id !== id)); setArticles(p => { const n = { ...p }; delete n[id]; return n; }); if (activeFilter === id) setActiveFilter('all'); };
  const markBroken = (id) => {
    const a = Object.values(articles).flat().find(x => x.id === id);
    setBrokenIds(p => { const n = new Set(p); n.add(id); if (a?.url) n.add(a.url); return n; });
  };
  const openArticle = (a) => { if (contentRef.current) setScrollY(contentRef.current.scrollTop); setReader(a); };
  const closeReader = () => { setReader(null); requestAnimationFrame(() => { if (contentRef.current) contentRef.current.scrollTop = scrollY; }); };

  // Filter, sort, deduplicate
  const normTitle = (t) => t.toLowerCase().replace(/[^a-z\u00e4\u00f6\u00fc\u00df0-9]/g, '').slice(0, 60);
  const allArticles = (() => {
    const sorted = Object.values(articles).flat()
      .filter(a => !a.paywall && !brokenIds.has(a.id) && !brokenIds.has(a.url))
      .filter(a => activeFilter === 'all' || a.sourceId === activeFilter)
      .sort((a, b) => (b.pubDate ? new Date(b.pubDate).getTime() : 0) - (a.pubDate ? new Date(a.pubDate).getTime() : 0));
    const seen = new Set();
    return sorted.filter(a => {
      const k = normTitle(a.title);
      if (seen.has(k)) return false;
      for (const s of seen) { if (k.length > 20 && s.length > 20 && (k.includes(s.slice(0, 30)) || s.includes(k.slice(0, 30)))) return false; }
      seen.add(k); return true;
    });
  })();

  const anyLoad = Object.values(loading).some(Boolean);
  const visibleErrors = Object.entries(errors).filter(([, v]) => v);
  const colors = LANG_COLORS[langMode];

  if (reader) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <Reader article={reader} langMode={langMode} transCache={transCache} onBack={closeReader} onMarkBroken={markBroken} onCacheTrans={cacheTrans} />
    </>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}} *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#f5f4f0', fontFamily: "'Source Sans 3', sans-serif" }}>
        {/* Header */}
        <div style={{ flexShrink: 0, zIndex: 100, padding: '10px clamp(16px, 4vw, 32px)', background: '#f5f4f0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sources.length > 0 ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 17, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, letterSpacing: -0.3, color: '#111' }}>Pressespiegel</h1>
              {langMode !== 'off' && colors && (
                <button onClick={() => setSettingsOpen(true)} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 100, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, cursor: 'pointer', letterSpacing: 0.3 }}>{LANG_LABELS[langMode]}</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setSettingsOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', display: 'flex', padding: 4 }}><IconGear /></button>
              <button onClick={() => setModal(true)} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Quelle</button>
            </div>
          </div>
          {/* Chips */}
          {sources.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2, scrollbarWidth: 'none' }}>
              <button onClick={() => setActiveFilter('all')} style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, border: activeFilter === 'all' ? '1.5px solid #111' : '1px solid #ddd', background: activeFilter === 'all' ? '#111' : '#fff', color: activeFilter === 'all' ? '#fff' : '#666', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: activeFilter === 'all' ? 600 : 400 }}>Alle</button>
              {sources.map(s => (
                <button key={s.id} onClick={() => setActiveFilter(activeFilter === s.id ? 'all' : s.id)} style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, border: activeFilter === s.id ? '1.5px solid #111' : '1px solid #ddd', background: activeFilter === s.id ? '#111' : '#fff', color: activeFilter === s.id ? '#fff' : '#666', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: activeFilter === s.id ? 600 : 400, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <img src={fav(dom(s.url))} alt="" width={12} height={12} style={{ borderRadius: 2, flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />{s.name}
                </button>
              ))}
              <button onClick={() => setSourcesOpen(true)} style={{ padding: '5px 12px', borderRadius: 100, fontSize: 12, border: '1px dashed #ccc', background: 'transparent', color: '#999', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontStyle: 'italic' }}>Quellen ...</button>
            </div>
          )}
        </div>

        {/* Translation progress */}
        {transProgress && (
          <div style={{ flexShrink: 0, padding: '5px 0', textAlign: 'center', fontSize: 11, color: colors?.text || '#666', background: colors?.bg || '#f5f5f5', animation: 'pulse 1s ease-in-out infinite', letterSpacing: 0.3 }}>
            Artikel werden {langMode === 'jugend' ? 'in Jugendsprache' : 'vereinfacht'} ...
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {pullState !== 'idle' && <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: '#999', animation: pullState === 'refreshing' ? 'pulse 1s ease-in-out infinite' : 'none' }}>{pullState === 'pulling' ? 'Loslassen zum Aktualisieren' : 'Aktualisiere ...'}</div>}
          <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 900, margin: '0 auto' }}>
            {visibleErrors.length > 0 && <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: '#f9f5eb', border: '1px solid #e8e0c8', fontSize: 12, color: '#8a7a5a' }}>{visibleErrors.map(([id, msg]) => { const s = sources.find(x => x.id === id); return <div key={id} style={{ marginTop: 2 }}>{s?.name}: {msg}</div>; })}</div>}
            {anyLoad && allArticles.length === 0 && <div style={{ padding: '80px 0', textAlign: 'center', color: '#bbb', fontSize: 13, animation: 'pulse 1.5s ease-in-out infinite' }}>Artikel werden geladen ...</div>}
            {sources.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'clamp(60px, 15vw, 120px) 20px', color: '#999' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, color: '#ccc' }}>PRESSESPIEGEL</div>
                <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, lineHeight: 1.3, color: '#333', marginBottom: 12 }}>Dein Nachrichten&uuml;berblick</h2>
                <p style={{ fontSize: 14, color: '#888', maxWidth: 340, margin: '0 auto 28px', lineHeight: 1.6 }}>F&uuml;ge Nachrichtenquellen hinzu. 100+ RSS-Feeds werden automatisch erkannt.</p>
                <button onClick={() => setModal(true)} style={{ padding: '13px 28px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Erste Quelle hinzuf&uuml;gen</button>
              </div>
            )}
            {allArticles.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: 'clamp(10px, 2vw, 16px)' }}>
                {allArticles.map(a => <FeedCard key={a.id} article={a} langMode={langMode} transCache={transCache} onClick={() => openArticle(a)} />)}
              </div>
            )}
            {allArticles.length > 0 && <div style={{ textAlign: 'center', padding: '24px 0 48px', color: '#ccc', fontSize: 12 }}>{allArticles.length} Artikel</div>}
          </div>
        </div>
      </div>

      {modal && <Modal onAdd={add} onClose={() => setModal(false)} />}
      {settingsOpen && <SettingsDrawer langMode={langMode} onLangChange={setLangMode} onClose={() => setSettingsOpen(false)} />}
      {sourcesOpen && <SourcesDrawer sources={sources} onReorder={setSources} onRemove={remove} onClose={() => setSourcesOpen(false)} />}
    </>
  );
}
