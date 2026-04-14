'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const SK = 'ps-src-v2', CK = 'ps-cache-v2', TTL = 30 * 60 * 1000;
const uid = () => Math.random().toString(36).slice(2, 9);
const dom = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return u; } };
const norm = (u) => u.startsWith('http') ? u : 'https://' + u;
const fav = (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;

// ─── Feed Card (Flipboard-style, full-viewport snap) ───
function FeedCard({ article, onOpen, isFirst }) {
  return (
    <div style={{
      scrollSnapAlign: 'start',
      height: '100dvh', width: '100%',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: 'clamp(20px, 5vw, 48px)',
      paddingTop: isFirst ? 'clamp(80px, 12vw, 120px)' : 'clamp(20px, 5vw, 48px)',
      cursor: 'pointer',
      position: 'relative',
      borderBottom: '1px solid #eae7e2',
    }} onClick={() => onOpen(article)}>
      {/* Source + Time - top */}
      <div style={{
        position: 'absolute', top: isFirst ? 'clamp(56px, 10vw, 90px)' : 'clamp(20px, 4vw, 40px)',
        left: 'clamp(20px, 5vw, 48px)', right: 'clamp(20px, 5vw, 48px)',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: '#999', letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}>
        <img src={fav(dom(article.sourceUrl))} alt="" width={14} height={14}
          style={{ borderRadius: 3, opacity: 0.7 }}
          onError={(e) => { e.target.style.display = 'none'; }} />
        <span>{article.sourceName}</span>
        {article.pubDate && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {new Date(article.pubDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680 }}>
        <h2 style={{
          fontSize: 'clamp(24px, 5vw, 38px)',
          fontWeight: 700, lineHeight: 1.2,
          fontFamily: "'Libre Baskerville', serif",
          color: '#111', marginBottom: 16,
          letterSpacing: '-0.3px',
        }}>{article.title}</h2>

        {article.summary && (
          <p style={{
            fontSize: 'clamp(15px, 2.5vw, 18px)',
            lineHeight: 1.65, color: '#555',
            fontFamily: "'Source Sans 3', sans-serif",
            maxWidth: 600,
          }}>{article.summary}</p>
        )}

        <div style={{
          marginTop: 24, fontSize: 13,
          color: '#c0392b', fontWeight: 600,
          fontFamily: "'Source Sans 3', sans-serif",
          letterSpacing: 0.3,
        }}>
          WEITERLESEN →
        </div>
      </div>
    </div>
  );
}

// ─── Reader View ───
function Reader({ article, onBack }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const r = await fetch('/api/article', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: article.url, title: article.title }) });
        const d = await r.json();
        if (!c) {
          if (d.error) setError(d.error);
          else if (d.content?.trim().toUpperCase().startsWith('PAYWALL')) setError('paywall');
          else setContent(d.content);
          setLoading(false);
        }
      } catch (e) { if (!c) { setError(e.message); setLoading(false); } }
    })();
    return () => { c = true; };
  }, [article]);

  return (
    <div style={{ minHeight: '100dvh', background: '#faf9f7' }}>
      {/* Sticky header bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '14px clamp(20px, 5vw, 48px)',
        background: 'rgba(250,249,247,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #eae7e2',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: '#111',
          cursor: 'pointer', fontSize: 14, fontFamily: "'Source Sans 3', sans-serif",
          padding: 0, fontWeight: 600, letterSpacing: 0.3,
        }}>← ZURÜCK</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={fav(dom(article.sourceUrl))} alt="" width={16} height={16}
            style={{ borderRadius: 3, opacity: 0.6 }}
            onError={(e) => { e.target.style.display = 'none'; }} />
          <span style={{ fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>{article.sourceName}</span>
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            title="Originalseite öffnen"
            style={{ color: '#999', textDecoration: 'none', fontSize: 14, lineHeight: 1, marginLeft: 4 }}>
            ↗
          </a>
        </div>
      </div>

      {/* Article */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(24px, 6vw, 56px) clamp(20px, 5vw, 48px)' }}>
        {article.pubDate && (
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12, fontVariantNumeric: 'tabular-nums', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {new Date(article.pubDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        )}

        <h1 style={{
          fontSize: 'clamp(26px, 5.5vw, 40px)',
          fontWeight: 700, lineHeight: 1.15,
          fontFamily: "'Libre Baskerville', serif",
          color: '#111', marginBottom: 20,
          letterSpacing: '-0.5px',
        }}>{article.title}</h1>

        {article.summary && (
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 19px)',
            lineHeight: 1.6, color: '#666',
            fontFamily: "'Source Sans 3', sans-serif",
            fontWeight: 300, marginBottom: 32,
            fontStyle: 'italic',
          }}>{article.summary}</p>
        )}

        <div style={{ width: 40, height: 1, background: '#ccc', marginBottom: 32 }} />

        {loading && <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14, animation: 'pulse 1.5s ease-in-out infinite' }}>Wird geladen…</div>}

        {error && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            {error === 'paywall' ? (
              <div style={{ color: '#888', fontSize: 15 }}>
                <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: '#c0392b' }}>Bezahlinhalt</div>
                Dieser Artikel steht hinter einer Paywall.
              </div>
            ) : (
              <div style={{ color: '#888', fontSize: 15 }}>{error}</div>
            )}
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block', marginTop: 20, padding: '10px 24px',
              borderRadius: 8, border: '1px solid #ddd', color: '#555',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}>Auf Originalseite lesen ↗</a>
          </div>
        )}

        {content && (
          <div style={{
            fontSize: 'clamp(16px, 2.5vw, 18px)',
            lineHeight: 1.85, color: '#333',
            whiteSpace: 'pre-wrap',
            fontFamily: "'Libre Baskerville', serif",
          }}>{content}</div>
        )}
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
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#faf9f7', borderRadius: 16,
        padding: 'clamp(24px, 5vw, 36px)',
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 18, fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>
          Quelle hinzufügen
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>URL</label>
            <input ref={ref} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="spiegel.de" onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '14px 0', borderRadius: 0, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', color: '#111', fontSize: 17, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>NAME (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Der Spiegel" onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{ width: '100%', padding: '14px 0', borderRadius: 0, border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', color: '#111', fontSize: 17, fontFamily: "'Source Sans 3', sans-serif", outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '13px 0', borderRadius: 8, border: '1px solid #ddd', background: 'transparent', color: '#888', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Source Sans 3', sans-serif" }}>Abbrechen</button>
            <button onClick={submit} style={{ flex: 1, padding: '13px 0', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Source Sans 3', sans-serif", opacity: url.trim() ? 1 : 0.3 }}>Hinzufügen</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Source Manager (shown when tapping the source count) ───
function SourceDrawer({ sources, onRemove, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex',
      justifyContent: 'flex-end',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#faf9f7', width: 'min(320px, 85vw)',
        height: '100%', padding: '32px 24px',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.1)',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Libre Baskerville', serif" }}>Quellen</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
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

// ─── Main App ───
export default function Home() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [reader, setReader] = useState(null);
  const [ready, setReady] = useState(false);
  const proc = useRef(false);

  useEffect(() => {
    try { const s = localStorage.getItem(SK); if (s) setSources(JSON.parse(s)); } catch {}
    try { const c = localStorage.getItem(CK); if (c) { const { d, t } = JSON.parse(c); if (Date.now() - t < TTL) setArticles(d); } } catch {}
    setReady(true);
  }, []);

  useEffect(() => { if (ready) try { localStorage.setItem(SK, JSON.stringify(sources)); } catch {} }, [sources, ready]);
  useEffect(() => { if (ready && Object.keys(articles).length) try { localStorage.setItem(CK, JSON.stringify({ d: articles, t: Date.now() })); } catch {} }, [articles, ready]);

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
        }
      } catch (e) { setErrors((p) => ({ ...p, [src.id]: e.message })); setArticles((p) => ({ ...p, [src.id]: [] })); }
      setLoading((p) => ({ ...p, [src.id]: false }));
      if (q.indexOf(src) < q.length - 1) await new Promise((r) => setTimeout(r, 300));
    }
    proc.current = false;
  }, []);

  useEffect(() => { if (!ready) return; const t = sources.filter((s) => !articles[s.id] && !loading[s.id] && !errors[s.id]); if (t.length) load(t); }, [sources, ready, articles]);

  const add = (s) => { setSources((p) => [...p, s]); setModal(false); };
  const remove = (id) => { setSources((p) => p.filter((s) => s.id !== id)); setArticles((p) => { const n = { ...p }; delete n[id]; return n; }); setErrors((p) => { const n = { ...p }; delete n[id]; return n; }); };
  const refresh = () => { setArticles({}); setErrors({}); load([...sources]); };

  // Filter paywall, sort by time
  const allArticles = Object.values(articles).flat()
    .filter((a) => !a.paywall)
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

  const anyLoad = Object.values(loading).some(Boolean);
  const errs = Object.entries(errors).filter(([, v]) => v);

  if (reader) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}} html{scroll-behavior:smooth}`}</style>
      <Reader article={reader} onBack={() => setReader(null)} />
    </>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        html{scroll-behavior:smooth}
        body{overflow:hidden}
      `}</style>

      {/* Fixed header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '12px clamp(20px, 5vw, 48px)',
        background: 'rgba(250,249,247,0.88)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{
            fontSize: 18, fontFamily: "'Libre Baskerville', serif",
            fontWeight: 700, letterSpacing: -0.3, color: '#111',
          }}>Pressespiegel</h1>
          {sources.length > 0 && (
            <button onClick={() => setDrawer(true)} style={{
              background: 'none', border: 'none', fontSize: 12,
              color: '#999', cursor: 'pointer', fontFamily: "'Source Sans 3', sans-serif",
            }}>{sources.length} Quellen</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {sources.length > 0 && (
            <button onClick={refresh} disabled={anyLoad} style={{
              background: 'none', border: 'none',
              color: anyLoad ? '#ccc' : '#999', fontSize: 16,
              cursor: anyLoad ? 'not-allowed' : 'pointer',
            }}>↻</button>
          )}
          <button onClick={() => setModal(true)} style={{
            background: '#111', color: '#fff', border: 'none',
            borderRadius: 6, padding: '6px 14px', fontSize: 12,
            fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3,
            fontFamily: "'Source Sans 3', sans-serif",
          }}>+ Quelle</button>
        </div>
      </div>

      {/* Feed */}
      <div style={{
        height: '100dvh', overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        background: '#faf9f7',
      }}>
        {/* Errors */}
        {errs.length > 0 && (
          <div style={{
            scrollSnapAlign: 'start',
            padding: 'clamp(70px, 12vw, 100px) clamp(20px, 5vw, 48px) 20px',
          }}>
            {errs.map(([id, msg]) => {
              const s = sources.find((x) => x.id === id);
              return <div key={id} style={{ fontSize: 13, color: '#c0392b', marginBottom: 4 }}><strong>{s?.name}:</strong> {msg}</div>;
            })}
          </div>
        )}

        {/* Loading state */}
        {anyLoad && allArticles.length === 0 && (
          <div style={{
            scrollSnapAlign: 'start',
            height: '100dvh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 14, color: '#999', animation: 'pulse 1.5s ease-in-out infinite', fontFamily: "'Source Sans 3', sans-serif" }}>
              Artikel werden geladen…
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 }}>
              {Object.entries(loading).filter(([, v]) => v).map(([id]) => {
                const s = sources.find((x) => x.id === id);
                return <span key={id} style={{ fontSize: 11, color: '#bbb' }}>{s?.name}</span>;
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sources.length === 0 && (
          <div style={{
            scrollSnapAlign: 'start',
            height: '100dvh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', padding: 32,
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#bbb', marginBottom: 24 }}>PRESSESPIEGEL</div>
            <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 700, textAlign: 'center', lineHeight: 1.3, color: '#222', marginBottom: 12 }}>
              Dein persönlicher<br />Nachrichtenüberblick
            </h2>
            <p style={{ fontSize: 15, color: '#888', textAlign: 'center', maxWidth: 320, lineHeight: 1.6, marginBottom: 32, fontFamily: "'Source Sans 3', sans-serif" }}>
              100+ Nachrichtenquellen werden automatisch über RSS erkannt.
            </p>
            <button onClick={() => setModal(true)} style={{
              padding: '14px 32px', borderRadius: 8, border: 'none',
              background: '#111', color: '#fff', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Source Sans 3', sans-serif",
              letterSpacing: 0.3,
            }}>Erste Quelle hinzufügen</button>
          </div>
        )}

        {/* Article cards */}
        {allArticles.map((a, i) => (
          <FeedCard key={a.id} article={a} onOpen={setReader} isFirst={i === 0} />
        ))}

        {/* End spacer */}
        {allArticles.length > 0 && (
          <div style={{
            scrollSnapAlign: 'start',
            height: '40dvh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#ccc', fontSize: 13,
            fontFamily: "'Source Sans 3', sans-serif",
          }}>
            {allArticles.length} Artikel · {sources.length} Quellen
          </div>
        )}
      </div>

      {modal && <Modal onAdd={add} onClose={() => setModal(false)} />}
      {drawer && <SourceDrawer sources={sources} onRemove={remove} onClose={() => setDrawer(false)} />}
    </>
  );
}
