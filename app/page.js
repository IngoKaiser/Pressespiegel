'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SK = 'ps-src-v4', CK = 'ps-cache-v4', TTL = 20 * 60 * 1000;
const uid = () => Math.random().toString(36).slice(2, 9);
const dom = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return u; } };
const norm = (u) => u.startsWith('http') ? u : 'https://' + u;
const fav = (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;

const IconExternal = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4" /><path d="M9 2h5v5" /><path d="M6 10L14 2" />
  </svg>
);

// ─── Card ───
function FeedCard({ article, onClick }) {
  const [hover, setHover] = useState(false);
  const hasImg = !!article.image;
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      cursor: 'pointer', display: 'flex', flexDirection: hasImg ? 'column' : 'row',
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      border: hover ? '1px solid #bbb' : '1px solid #e8e5e0',
      transition: 'all 0.2s ease', transform: hover ? 'translateY(-1px)' : 'none',
      boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.06)' : 'none', height: '100%',
    }}>
      {hasImg && <div style={{ height: 'clamp(140px, 25vw, 200px)', backgroundImage: `url(${article.image})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />}
      <div style={{ padding: 'clamp(14px, 3vw, 20px)', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#999', letterSpacing: 0.2 }}>
          <img src={fav(dom(article.sourceUrl))} alt="" width={12} height={12} style={{ borderRadius: 2, flexShrink: 0, opacity: 0.7 }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span>{article.sourceName}</span>
          {article.pubDate && (<><span style={{ opacity: 0.4 }}>|</span><span>{new Date(article.pubDate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span></>)}
        </div>
        <h3 style={{ margin: 0, fontSize: 'clamp(15px, 2.5vw, 17px)', fontWeight: 700, lineHeight: 1.3, fontFamily: "'Libre Baskerville', serif", color: '#111', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h3>
        {article.summary && <p style={{ margin: 0, fontSize: 'clamp(13px, 2vw, 14px)', lineHeight: 1.55, color: '#666', display: '-webkit-box', WebkitLineClamp: hasImg ? 3 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{article.summary}</p>}
      </div>
    </div>
  );
}

// ─── Reader ───
function Reader({ article, onBack, onMarkBroken }) {
  const [content, setContent] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/article', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: article.url, title: article.title }) });
        const d = await r.json();
        if (!c) {
          if (d.images) setImages(d.images);
          if (d.error) { setError(d.error); }
          else if (d.content === 'PAYWALL' || d.content === 'NOT_EXTRACTABLE') {
            // Mark this article so it gets filtered from the list
            onMarkBroken(article.id);
            setError(d.content === 'PAYWALL' ? 'paywall' : 'not_extractable');
          }
          else setContent(d.content);
          setLoading(false);
        }
      } catch (e) { if (!c) { setError(e.message); setLoading(false); } }
    })();
    return () => { c = true; };
  }, [article]);

  const heroImage = article.image || images[0];

  return (
    <div style={{ minHeight: '100dvh', background: '#faf9f7' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '12px clamp(16px, 4vw, 32px)',
        background: 'rgba(250,249,247,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #eae7e2',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: 13, fontFamily: "'Source Sans 3', sans-serif", padding: 0, fontWeight: 600, letterSpacing: 0.3 }}>
          &larr; ZUR&Uuml;CK
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={fav(dom(article.sourceUrl))} alt="" width={14} height={14} style={{ borderRadius: 3, opacity: 0.6 }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{article.sourceName}</span>
          <a href={article.url} target="_blank" rel="noopener noreferrer" title="Originalseite" style={{ color: '#999', display: 'flex', alignItems: 'center', marginLeft: 4 }}><IconExternal /></a>
        </div>
      </div>

      {heroImage && <div style={{ width: '100%', height: 'clamp(200px, 35vw, 360px)', backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}

      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)' }}>
        {article.pubDate && <div style={{ fontSize: 12, color: '#999', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>{new Date(article.pubDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>}
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, lineHeight: 1.18, fontFamily: "'Libre Baskerville', serif", color: '#111', marginBottom: 16, letterSpacing: '-0.3px' }}>{article.title}</h1>
        {article.summary && <p style={{ fontSize: 'clamp(15px, 2.3vw, 18px)', lineHeight: 1.6, color: '#666', fontStyle: 'italic', marginBottom: 28 }}>{article.summary}</p>}
        <div style={{ width: 32, height: 1, background: '#ddd', marginBottom: 28 }} />

        {loading && <div style={{ padding: '48px 0', textAlign: 'center', color: '#bbb', fontSize: 14, animation: 'pulse 1.5s ease-in-out infinite' }}>Wird geladen ...</div>}

        {error && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
              {error === 'paywall' && <><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, color: '#c0392b', fontWeight: 600 }}>Bezahlinhalt</div>Dieser Artikel erfordert ein Abonnement.</>}
              {error === 'not_extractable' && 'Artikelinhalt konnte nicht geladen werden (Video, Audio oder interaktiver Inhalt).'}
              {error !== 'paywall' && error !== 'not_extractable' && error}
            </div>
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', color: '#555', textDecoration: 'none', fontSize: 13 }}>Originalseite <IconExternal /></a>
          </div>
        )}

        {content && <div style={{ fontSize: 'clamp(15px, 2.3vw, 17px)', lineHeight: 1.85, color: '#333', whiteSpace: 'pre-wrap', fontFamily: "'Libre Baskerville', serif" }}>{content}</div>}
      </div>
    </div>
  );
}

// ─── Modal ───
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
            <input ref={ref} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="spiegel.de" onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '14px 0', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', color: '#111', fontSize: 17, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>NAME (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Der Spiegel" onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '14px 0', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', color: '#111', fontSize: 17, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
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

// ─── Source Drawer ───
function SourceDrawer({ sources, onRemove, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#faf9f7', width: 'min(320px, 85vw)', height: '100%', padding: '32px 24px', boxShadow: '-8px 0 40px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Libre Baskerville', serif" }}>Quellen</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>x</button>
        </div>
        {sources.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={fav(dom(s.url))} alt="" width={16} height={16} style={{ borderRadius: 3 }} onError={(e) => { e.target.style.display = 'none'; }} />
              <span style={{ fontSize: 14 }}>{s.name}</span>
            </div>
            <button onClick={() => onRemove(s.id)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#c0392b', cursor: 'pointer', fontWeight: 600 }}>Entfernen</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ───
export default function Home() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState({});
  const [brokenIds, setBrokenIds] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [reader, setReader] = useState(null);
  const [ready, setReady] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [pullState, setPullState] = useState('idle'); // idle | pulling | refreshing
  const feedRef = useRef(null);
  const proc = useRef(false);
  const touchStart = useRef(0);

  useEffect(() => {
    try { const s = localStorage.getItem(SK); if (s) setSources(JSON.parse(s)); } catch {}
    try { const c = localStorage.getItem(CK); if (c) { const { d, t } = JSON.parse(c); if (Date.now() - t < TTL) setArticles(d); } } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(SK, JSON.stringify(sources)); } catch {} }, [sources, ready]);
  useEffect(() => { if (ready && Object.keys(articles).length) try { localStorage.setItem(CK, JSON.stringify({ d: articles, t: Date.now() })); } catch {} }, [articles, ready]);

  // Auto-dismiss errors after 5s
  useEffect(() => {
    const ids = Object.keys(errors).filter(k => errors[k]);
    if (ids.length === 0) return;
    const timer = setTimeout(() => {
      setErrors(prev => {
        const next = { ...prev };
        ids.forEach(id => { delete next[id]; });
        return next;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [errors]);

  const load = useCallback(async (q) => {
    if (proc.current || !q.length) return;
    proc.current = true;
    for (const src of q) {
      setLoading((p) => ({ ...p, [src.id]: true }));
      setErrors((p) => ({ ...p, [src.id]: null }));
      try {
        const r = await fetch('/api/headlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl: src.url, sourceName: src.name }) });
        const d = await r.json();
        if (d.error) {
          // Only show error for "no RSS found", not for "no articles today"
          setErrors((p) => ({ ...p, [src.id]: d.error }));
          setArticles((p) => ({ ...p, [src.id]: [] }));
        } else {
          const enriched = (d.articles || []).map((a) => ({ ...a, id: uid(), sourceId: src.id, sourceName: src.name, sourceUrl: src.url }));
          setArticles((p) => ({ ...p, [src.id]: enriched }));
        }
      } catch (e) { setErrors((p) => ({ ...p, [src.id]: e.message })); setArticles((p) => ({ ...p, [src.id]: [] })); }
      setLoading((p) => ({ ...p, [src.id]: false }));
      if (q.indexOf(src) < q.length - 1) await new Promise((r) => setTimeout(r, 300));
    }
    proc.current = false;
  }, []);

  useEffect(() => { if (!ready) return; const t = sources.filter((s) => !articles[s.id] && !loading[s.id]); if (t.length) load(t); }, [sources, ready, articles]);

  // Pull-to-refresh handlers
  const onTouchStart = (e) => { if (feedRef.current?.scrollTop === 0) touchStart.current = e.touches[0].clientY; else touchStart.current = 0; };
  const onTouchMove = (e) => { if (touchStart.current && e.touches[0].clientY - touchStart.current > 60 && pullState === 'idle') setPullState('pulling'); };
  const onTouchEnd = () => {
    if (pullState === 'pulling') {
      setPullState('refreshing');
      setArticles({}); setErrors({}); setBrokenIds(new Set());
      load([...sources]).then(() => setPullState('idle'));
    }
    touchStart.current = 0;
  };

  const add = (s) => { setSources((p) => [...p, s]); setModal(false); };
  const remove = (id) => { setSources((p) => p.filter((s) => s.id !== id)); setArticles((p) => { const n = { ...p }; delete n[id]; return n; }); if (activeFilter === id) setActiveFilter('all'); };
  const markBroken = (id) => setBrokenIds(prev => new Set(prev).add(id));

  const openArticle = (article) => { if (feedRef.current) setScrollY(feedRef.current.scrollTop); setReader(article); };
  const closeReader = () => { setReader(null); requestAnimationFrame(() => { if (feedRef.current) feedRef.current.scrollTop = scrollY; }); };

  // Filter: no paywall, no broken, apply source filter, sort by time
  const allArticles = Object.values(articles).flat()
    .filter((a) => !a.paywall && !brokenIds.has(a.id))
    .filter((a) => activeFilter === 'all' || a.sourceId === activeFilter)
    .sort((a, b) => (b.pubDate ? new Date(b.pubDate).getTime() : 0) - (a.pubDate ? new Date(a.pubDate).getTime() : 0));

  const anyLoad = Object.values(loading).some(Boolean);
  const visibleErrors = Object.entries(errors).filter(([, v]) => v);

  if (reader) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <Reader article={reader} onBack={closeReader} onMarkBroken={markBroken} />
    </>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}} *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div ref={feedRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ height: '100dvh', overflowY: 'auto', background: '#f5f4f0', fontFamily: "'Source Sans 3', sans-serif" }}>

        {/* Pull indicator */}
        {pullState !== 'idle' && (
          <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: '#999', animation: pullState === 'refreshing' ? 'pulse 1s ease-in-out infinite' : 'none' }}>
            {pullState === 'pulling' ? 'Loslassen zum Aktualisieren' : 'Aktualisiere ...'}
          </div>
        )}

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          padding: '10px clamp(16px, 4vw, 32px)',
          background: 'rgba(245,244,240,0.9)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sources.length > 0 ? 10 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 style={{ fontSize: 17, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, letterSpacing: -0.3, color: '#111' }}>Pressespiegel</h1>
              {sources.length > 0 && (
                <button onClick={() => setDrawer(true)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#999', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  {sources.length} Quellen
                </button>
              )}
            </div>
            <button onClick={() => setModal(true)} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.2 }}>+ Quelle</button>
          </div>

          {/* Filter chips */}
          {sources.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <button onClick={() => setActiveFilter('all')} style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 12,
                border: activeFilter === 'all' ? '1.5px solid #111' : '1px solid #ddd',
                background: activeFilter === 'all' ? '#111' : '#fff',
                color: activeFilter === 'all' ? '#fff' : '#666',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: activeFilter === 'all' ? 600 : 400,
              }}>Alle</button>
              {sources.map((s) => (
                <button key={s.id} onClick={() => setActiveFilter(activeFilter === s.id ? 'all' : s.id)} style={{
                  padding: '5px 12px', borderRadius: 100, fontSize: 12,
                  border: activeFilter === s.id ? '1.5px solid #111' : '1px solid #ddd',
                  background: activeFilter === s.id ? '#111' : '#fff',
                  color: activeFilter === s.id ? '#fff' : '#666',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: activeFilter === s.id ? 600 : 400,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <img src={fav(dom(s.url))} alt="" width={12} height={12} style={{ borderRadius: 2, flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 900, margin: '0 auto' }}>
          {/* Errors - subtle, auto-dismiss */}
          {visibleErrors.length > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: '#f9f5eb', border: '1px solid #e8e0c8', fontSize: 12, color: '#8a7a5a' }}>
              {visibleErrors.map(([id, msg]) => {
                const s = sources.find((x) => x.id === id);
                return <div key={id} style={{ marginTop: 2 }}>{s?.name}: {msg}</div>;
              })}
            </div>
          )}

          {/* Loading */}
          {anyLoad && allArticles.length === 0 && (
            <div style={{ padding: '80px 0', textAlign: 'center', color: '#bbb', fontSize: 13, animation: 'pulse 1.5s ease-in-out infinite' }}>
              Artikel werden geladen ...
            </div>
          )}

          {/* Empty */}
          {sources.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'clamp(60px, 15vw, 120px) 20px', color: '#999' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, color: '#ccc' }}>PRESSESPIEGEL</div>
              <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, lineHeight: 1.3, color: '#333', marginBottom: 12 }}>
                Dein Nachrichten&uuml;berblick
              </h2>
              <p style={{ fontSize: 14, color: '#888', maxWidth: 340, margin: '0 auto 28px', lineHeight: 1.6 }}>
                F&uuml;ge Nachrichtenquellen hinzu. 100+ RSS-Feeds werden automatisch erkannt.
              </p>
              <button onClick={() => setModal(true)} style={{ padding: '13px 28px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Erste Quelle hinzuf&uuml;gen</button>
            </div>
          )}

          {/* Grid */}
          {allArticles.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))', gap: 'clamp(10px, 2vw, 16px)' }}>
              {allArticles.map((a) => <FeedCard key={a.id} article={a} onClick={() => openArticle(a)} />)}
            </div>
          )}

          {allArticles.length > 0 && <div style={{ textAlign: 'center', padding: '24px 0 48px', color: '#ccc', fontSize: 12 }}>{allArticles.length} Artikel</div>}
        </div>
      </div>

      {modal && <Modal onAdd={add} onClose={() => setModal(false)} />}
      {drawer && <SourceDrawer sources={sources} onRemove={remove} onClose={() => setDrawer(false)} />}
    </>
  );
}
