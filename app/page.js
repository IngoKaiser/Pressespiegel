'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'pressespiegel-sources';
const CACHE_KEY = 'pressespiegel-cache';
const CACHE_TTL = 30 * 60 * 1000;

const uid = () => Math.random().toString(36).slice(2, 9);
const dom = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return u; } };
const norm = (u) => u.startsWith('http') ? u : 'https://' + u;
const fav = (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;

function Pill({ children, active, onClick, style: s }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '7px 14px', borderRadius: 100,
      background: active ? '#c0392b' : '#fff',
      color: active ? '#fff' : '#1a1a1a',
      fontSize: 13, fontFamily: "'Source Sans 3', sans-serif",
      fontWeight: active ? 600 : 400,
      border: active ? '2px solid #c0392b' : '1px solid #e8e5e0',
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      lineHeight: 1.2, transition: 'all 0.15s ease', ...s,
    }}>{children}</button>
  );
}

function Card({ article, onClick }) {
  const [h, setH] = useState(false);
  return (
    <article onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: '#fff', borderRadius: 14, padding: 'clamp(16px, 3vw, 24px)',
      cursor: 'pointer', border: h ? '1px solid #c0392b' : '1px solid #e8e5e0',
      transform: h ? 'translateY(-2px)' : 'none',
      boxShadow: h ? '0 8px 24px rgba(0,0,0,0.07)' : 'none',
      transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
        <img src={fav(dom(article.sourceUrl))} alt="" width={14} height={14} style={{ borderRadius: 3, flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />
        <span>{article.sourceName}</span>
        {article.paywall && <span style={{ background: '#fff3e0', color: '#e65100', padding: '1px 7px', borderRadius: 100, fontSize: 10, fontWeight: 700 }}>PLUS</span>}
        {article.pubDate && <span style={{ fontSize: 11, opacity: 0.6 }}>{new Date(article.pubDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <h3 style={{ margin: 0, fontSize: 'clamp(14px, 2.3vw, 16px)', fontWeight: 700, lineHeight: 1.38, fontFamily: "'Libre Baskerville', serif" }}>{article.title}</h3>
      {article.summary && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#555', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.summary}</p>}
    </article>
  );
}

function Reader({ article, onBack }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [method, setMethod] = useState('');

  useEffect(() => {
    if (article.paywall) { setLoading(false); setError('Premium-Inhalt.'); return; }
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/article', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: article.url, title: article.title }) });
        const d = await r.json();
        if (!c) {
          if (d.error) setError(d.error);
          else if (d.content?.trim().toUpperCase().startsWith('PAYWALL')) setError('Paywall erkannt.');
          else { setContent(d.content); setMethod(d.method); }
          setLoading(false);
        }
      } catch (e) { if (!c) { setError(e.message); setLoading(false); } }
    })();
    return () => { c = true; };
  }, [article]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(16px, 4vw, 32px)' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 15, fontFamily: "'Source Sans 3', sans-serif", padding: 0, marginBottom: 24 }}>← Zurück</button>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 10, fontFamily: "'Source Sans 3', sans-serif", display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src={fav(dom(article.sourceUrl))} alt="" width={14} height={14} style={{ borderRadius: 3 }} onError={(e) => { e.target.style.display = 'none'; }} />
        {article.sourceName}
        {article.pubDate && <span>· {new Date(article.pubDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
      </div>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 700, lineHeight: 1.3, marginBottom: 16, fontFamily: "'Libre Baskerville', serif" }}>{article.title}</h1>
      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: '#c0392b', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'Source Sans 3', sans-serif", marginBottom: 24 }}>
        Originalseite öffnen ↗
      </a>
      <div style={{ borderTop: '1px solid #e8e5e0', paddingTop: 24 }}>
        {loading && <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14, fontFamily: "'Source Sans 3', sans-serif", animation: 'pulse 1.5s ease-in-out infinite' }}>Wird geladen…</div>}
        {error && (
          <div style={{ textAlign: 'center', padding: 40, color: '#e65100', background: '#fff3e0', borderRadius: 12, fontFamily: "'Source Sans 3', sans-serif", fontSize: 15 }}>
            {error}
            <div style={{ marginTop: 16 }}>
              <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c0392b', textDecoration: 'none' }}>Auf Originalseite lesen ↗</a>
            </div>
          </div>
        )}
        {content && (
          <>
            {method === 'direct-partial' && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#fef9e7', border: '1px solid #f9e79f', fontSize: 12, color: '#7d6608', fontFamily: "'Source Sans 3', sans-serif" }}>
                Nur Teilinhalt extrahiert. <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: '#c0392b' }}>Vollständig auf Originalseite lesen ↗</a>
              </div>
            )}
            <div style={{ fontSize: 'clamp(15px, 2.5vw, 17px)', lineHeight: 1.85, color: '#444', whiteSpace: 'pre-wrap', fontFamily: "'Libre Baskerville', serif" }}>{content}</div>
          </>
        )}
      </div>
    </div>
  );
}

function Modal({ onAdd, onClose }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const ref = useRef(null);
  useEffect(() => { document.body.style.overflow = 'hidden'; ref.current?.focus(); return () => { document.body.style.overflow = ''; }; }, []);
  const submit = () => { if (!url.trim()) return; const n = norm(url.trim()); onAdd({ id: uid(), url: n, name: name.trim() || dom(n) }); };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#faf9f7', borderRadius: 18, padding: 'clamp(20px, 4vw, 32px)', width: '100%', maxWidth: 420, border: '1px solid #e8e5e0', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontFamily: "'Libre Baskerville', serif" }}>Quelle hinzufügen</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Website-URL *</label>
            <input ref={ref} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="z.B. spiegel.de" onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e8e5e0', background: '#fff', color: '#1a1a1a', fontSize: 16, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>Anzeigename (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Der Spiegel" onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #e8e5e0', background: '#fff', color: '#1a1a1a', fontSize: 16, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #e8e5e0', background: 'transparent', color: '#666', fontSize: 15, fontFamily: "'Source Sans 3', sans-serif", cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={submit} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#c0392b', color: '#fff', fontSize: 15, fontWeight: 600, fontFamily: "'Source Sans 3', sans-serif", cursor: 'pointer', opacity: url.trim() ? 1 : 0.4 }}>Hinzufügen</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState({});
  const [active, setActive] = useState('all');
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState(false);
  const [reader, setReader] = useState(null);
  const [ready, setReady] = useState(false);
  const proc = useRef(false);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setSources(JSON.parse(s)); } catch {}
    try { const c = localStorage.getItem(CACHE_KEY); if (c) { const { d, t } = JSON.parse(c); if (Date.now() - t < CACHE_TTL) setArticles(d); } } catch {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)); } catch {} }, [sources, ready]);
  useEffect(() => { if (ready && Object.keys(articles).length) try { localStorage.setItem(CACHE_KEY, JSON.stringify({ d: articles, t: Date.now() })); } catch {} }, [articles, ready]);

  const load = useCallback(async (q) => {
    if (proc.current || !q.length) return;
    proc.current = true;
    for (const src of q) {
      setLoading((p) => ({ ...p, [src.id]: true }));
      setErrors((p) => ({ ...p, [src.id]: null }));
      try {
        const r = await fetch('/api/headlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceUrl: src.url, sourceName: src.name }) });
        const d = await r.json();
        if (d.error) { setErrors((p) => ({ ...p, [src.id]: d.error })); setArticles((p) => ({ ...p, [src.id]: [] })); }
        else {
          const enriched = (d.articles || []).map((a) => ({ ...a, id: uid(), sourceId: src.id, sourceName: src.name, sourceUrl: src.url }));
          setArticles((p) => ({ ...p, [src.id]: enriched }));
          if (!enriched.length) setErrors((p) => ({ ...p, [src.id]: 'Keine Artikel.' }));
        }
      } catch (e) { setErrors((p) => ({ ...p, [src.id]: e.message })); setArticles((p) => ({ ...p, [src.id]: [] })); }
      setLoading((p) => ({ ...p, [src.id]: false }));
      if (q.indexOf(src) < q.length - 1) await new Promise((r) => setTimeout(r, 300));
    }
    proc.current = false;
  }, []);

  useEffect(() => { if (!ready) return; const t = sources.filter((s) => !articles[s.id] && !loading[s.id] && !errors[s.id]); if (t.length) load(t); }, [sources, ready, articles]);

  const add = (s) => { setSources((p) => [...p, s]); setModal(false); };
  const remove = (id) => { setSources((p) => p.filter((s) => s.id !== id)); setArticles((p) => { const n = { ...p }; delete n[id]; return n; }); setErrors((p) => { const n = { ...p }; delete n[id]; return n; }); if (active === id) setActive('all'); };
  const refresh = () => { setArticles({}); setErrors({}); load([...sources]); };
  const retry = (id) => { const s = sources.find((x) => x.id === id); if (!s) return; setArticles((p) => { const n = { ...p }; delete n[id]; return n; }); setErrors((p) => { const n = { ...p }; delete n[id]; return n; }); load([s]); };

  const shown = active === 'all' ? Object.values(articles).flat() : articles[active] || [];
  const anyLoad = Object.values(loading).some(Boolean);
  const errs = Object.entries(errors).filter(([, v]) => v);

  if (reader) return (
    <div style={{ background: '#faf9f7', minHeight: '100vh', fontFamily: "'Source Sans 3', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <Reader article={reader} onBack={() => setReader(null)} />
    </div>
  );

  return (
    <div style={{ background: '#faf9f7', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Source Sans 3', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>

      <header style={{ padding: 'clamp(14px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderBottom: '1px solid #e8e5e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontFamily: "'Libre Baskerville', serif", fontWeight: 700, letterSpacing: -0.5 }}>Pressespiegel</h1>
          <p style={{ marginTop: 2, fontSize: 13, color: '#888' }}>{sources.length === 0 ? 'Quellen hinzufügen' : `${sources.length} Quelle${sources.length !== 1 ? 'n' : ''} · ${shown.length} Artikel`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {sources.length > 0 && <button onClick={refresh} disabled={anyLoad} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #e8e5e0', background: 'transparent', color: '#666', fontSize: 14, cursor: anyLoad ? 'not-allowed' : 'pointer', opacity: anyLoad ? 0.5 : 1, fontFamily: "'Source Sans 3', sans-serif" }}>↻</button>}
          <button onClick={() => setModal(true)} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#c0392b', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Source Sans 3', sans-serif" }}>+ Quelle</button>
        </div>
      </header>

      {sources.length > 0 && (
        <div style={{ padding: '10px clamp(16px, 4vw, 32px)', display: 'flex', gap: 8, overflowX: 'auto', borderBottom: '1px solid #e8e5e0', WebkitOverflowScrolling: 'touch' }}>
          <Pill active={active === 'all'} onClick={() => setActive('all')}>Alle</Pill>
          {sources.map((s) => (
            <Pill key={s.id} active={active === s.id} onClick={() => setActive(s.id)}>
              <img src={fav(dom(s.url))} alt="" width={14} height={14} style={{ borderRadius: 3, flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />
              <span>{s.name}</span>
              <span onClick={(e) => { e.stopPropagation(); remove(s.id); }} style={{ opacity: 0.5, cursor: 'pointer', fontSize: 11, flexShrink: 0 }}>✕</span>
            </Pill>
          ))}
        </div>
      )}

      <div style={{ padding: 'clamp(16px, 4vw, 32px)', flex: 1 }}>
        {errs.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#991b1b' }}>
            {errs.map(([id, msg]) => {
              const s = sources.find((x) => x.id === id);
              return <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}><span><strong>{s?.name}:</strong> {msg}</span><button onClick={() => retry(id)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', flexShrink: 0 }}>Erneut</button></div>;
            })}
          </div>
        )}

        {Object.entries(loading).filter(([, v]) => v).length > 0 && (
          <div style={{ marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(loading).filter(([, v]) => v).map(([id]) => {
              const s = sources.find((x) => x.id === id);
              return <div key={id} style={{ padding: '5px 12px', borderRadius: 100, background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 12, color: '#0369a1', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <img src={fav(dom(s?.url || ''))} alt="" width={12} height={12} style={{ borderRadius: 2 }} onError={(e) => { e.target.style.display = 'none'; }} />{s?.name}…
              </div>;
            })}
          </div>
        )}

        {sources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'clamp(40px, 10vw, 80px) 16px', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>📰</div>
            <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#555' }}>Dein Pressespiegel ist leer</h2>
            <p style={{ fontSize: 14, maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.6 }}>100+ Nachrichtenquellen werden automatisch über RSS erkannt.</p>
            <button onClick={() => setModal(true)} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#c0392b', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Source Sans 3', sans-serif" }}>+ Erste Quelle</button>
          </div>
        ) : shown.length === 0 && !anyLoad ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888', fontSize: 14 }}>Keine Artikel. Klicke ↻</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
            {shown.map((a) => <Card key={a.id} article={a} onClick={() => setReader(a)} />)}
          </div>
        )}
      </div>

      {modal && <Modal onAdd={add} onClose={() => setModal(false)} />}
    </div>
  );
}
