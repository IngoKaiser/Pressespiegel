'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'pressespiegel-sources';
const CACHE_KEY = 'pressespiegel-cache';
const CACHE_TTL = 30 * 60 * 1000;

const generateId = () => Math.random().toString(36).slice(2, 10);
const extractDomain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
};
const normalizeUrl = (url) => {
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
};
const FAVICON = (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;

/* ── Source Pill ── */
function SourcePill({ source, active, onClick, onRemove }) {
  const domain = extractDomain(source.url);
  return (
    <div onClick={onClick} className="pill" style={{
      background: active ? 'var(--accent)' : 'var(--card-bg)',
      color: active ? '#fff' : 'var(--text)',
      fontWeight: active ? 600 : 400,
      border: active ? 'none' : '1px solid var(--border)',
    }}>
      <img src={FAVICON(domain)} alt="" style={{ width: 16, height: 16, borderRadius: 4 }}
        onError={(e) => (e.target.style.display = 'none')} />
      <span>{source.name || domain}</span>
      <span onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ marginLeft: 4, opacity: 0.5, cursor: 'pointer', fontSize: 12 }}>✕</span>
    </div>
  );
}

/* ── Article Card ── */
function ArticleCard({ article, onClick }) {
  return (
    <div onClick={onClick} className="article-card">
      <div className="article-meta">
        <img src={FAVICON(extractDomain(article.sourceUrl))} alt=""
          style={{ width: 14, height: 14, borderRadius: 3 }}
          onError={(e) => (e.target.style.display = 'none')} />
        <span>{article.sourceName}</span>
        {article.paywall && <span className="paywall-badge">Paywall</span>}
      </div>
      <h3 className="article-title">{article.title}</h3>
      {article.summary && <p className="article-summary">{article.summary}</p>}
    </div>
  );
}

/* ── Reader View ── */
function ReaderView({ article, onBack }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (article.paywall) {
      setLoading(false);
      setError('Dieser Artikel ist als Premium-Inhalt gekennzeichnet.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: article.url, title: article.title }),
        });
        const data = await resp.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error + (data.details ? `: ${data.details}` : ''));
          } else if (data.content?.trim().toUpperCase().startsWith('PAYWALL')) {
            setError('Dieser Artikel steht hinter einer Paywall.');
          } else {
            setContent(data.content);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [article]);

  return (
    <div className="reader">
      <button onClick={onBack} className="back-btn">← Zurück zur Übersicht</button>

      <div className="reader-meta">
        <img src={FAVICON(extractDomain(article.sourceUrl))} alt=""
          style={{ width: 14, height: 14, borderRadius: 3 }}
          onError={(e) => (e.target.style.display = 'none')} />
        {article.sourceName}
      </div>

      <h1 className="reader-title">{article.title}</h1>

      <a href={article.url} target="_blank" rel="noopener noreferrer" className="original-link">
        Originalseite öffnen ↗
      </a>

      <div className="reader-content">
        {loading && <div className="loading-text">Artikel wird geladen…</div>}
        {error && (
          <div className="error-box">
            {error}
            <div style={{ marginTop: 16 }}>
              <a href={article.url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Auf Originalseite lesen ↗
              </a>
            </div>
          </div>
        )}
        {content && <div className="reader-text">{content}</div>}
      </div>
    </div>
  );
}

/* ── Add Source Modal ── */
function AddSourceModal({ onAdd, onClose }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!url.trim()) return;
    const normalized = normalizeUrl(url.trim());
    onAdd({ id: generateId(), url: normalized, name: name.trim() || extractDomain(normalized) });
    setUrl(''); setName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif", marginBottom: 24 }}>
          Quelle hinzufügen
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Website-URL *</label>
            <input ref={inputRef} type="text" value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="z.B. spiegel.de"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input-field" />
          </div>
          <div>
            <label className="input-label">Anzeigename (optional)</label>
            <input type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Der Spiegel"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="input-field" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button onClick={handleSubmit} className="btn-primary"
              style={{ opacity: url.trim() ? 1 : 0.5 }}>Hinzufügen</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function Home() {
  const [sources, setSources] = useState([]);
  const [articles, setArticles] = useState({});
  const [activeSource, setActiveSource] = useState('all');
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [readerArticle, setReaderArticle] = useState(null);
  const [ready, setReady] = useState(false);
  const isProcessing = useRef(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSources(JSON.parse(saved));
    } catch {}
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) setArticles(data);
      }
    } catch {}
    setReady(true);
  }, []);

  // Save sources
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sources)); } catch {}
  }, [sources, ready]);

  // Save article cache
  useEffect(() => {
    if (!ready || Object.keys(articles).length === 0) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: articles, timestamp: Date.now() }));
    } catch {}
  }, [articles, ready]);

  const processQueue = useCallback(async (q) => {
    if (isProcessing.current || q.length === 0) return;
    isProcessing.current = true;

    for (const source of q) {
      setLoading((prev) => ({ ...prev, [source.id]: true }));
      setErrors((prev) => ({ ...prev, [source.id]: null }));

      try {
        const resp = await fetch('/api/headlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceUrl: source.url, sourceName: source.name }),
        });
        const data = await resp.json();

        if (data.error) {
          setErrors((prev) => ({ ...prev, [source.id]: data.error + (data.details ? `: ${data.details}` : '') }));
          setArticles((prev) => ({ ...prev, [source.id]: [] }));
        } else {
          const enriched = (data.articles || []).map((a) => ({
            ...a, id: generateId(), sourceId: source.id,
            sourceName: source.name, sourceUrl: source.url,
          }));
          if (enriched.length === 0) {
            setErrors((prev) => ({ ...prev, [source.id]: 'Keine Artikel gefunden.' }));
          }
          setArticles((prev) => ({ ...prev, [source.id]: enriched }));
        }
      } catch (err) {
        setErrors((prev) => ({ ...prev, [source.id]: err.message }));
        setArticles((prev) => ({ ...prev, [source.id]: [] }));
      }

      setLoading((prev) => ({ ...prev, [source.id]: false }));
      if (q.indexOf(source) < q.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    isProcessing.current = false;
  }, []);

  useEffect(() => {
    if (!ready) return;
    const toLoad = sources.filter((s) => !articles[s.id] && !loading[s.id] && !errors[s.id]);
    if (toLoad.length > 0) processQueue(toLoad);
  }, [sources, ready, articles]);

  const addSource = (source) => { setSources((prev) => [...prev, source]); setShowAddModal(false); };
  const removeSource = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setArticles((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };
  const refreshAll = () => { setArticles({}); setErrors({}); processQueue([...sources]); };
  const refreshSource = (id) => {
    const s = sources.find((x) => x.id === id);
    if (!s) return;
    setArticles((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
    processQueue([s]);
  };

  const displayed = activeSource === 'all'
    ? Object.values(articles).flat()
    : articles[activeSource] || [];
  const isAnyLoading = Object.values(loading).some(Boolean);
  const activeErrors = Object.entries(errors).filter(([, v]) => v);

  if (readerArticle) {
    return <ReaderView article={readerArticle} onBack={() => setReaderArticle(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="logo">Pressespiegel</h1>
          <p className="subtitle">
            {sources.length === 0
              ? 'Füge Nachrichtenquellen hinzu'
              : `${sources.length} Quelle${sources.length !== 1 ? 'n' : ''} · ${displayed.length} Artikel`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {sources.length > 0 && (
            <button onClick={refreshAll} disabled={isAnyLoading} className="btn-secondary"
              style={{ opacity: isAnyLoading ? 0.5 : 1, cursor: isAnyLoading ? 'not-allowed' : 'pointer' }}>
              ↻ Aktualisieren
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn-primary">+ Quelle</button>
        </div>
      </header>

      {/* Source pills */}
      {sources.length > 0 && (
        <div className="pills-bar">
          <div onClick={() => setActiveSource('all')} className="pill" style={{
            background: activeSource === 'all' ? 'var(--accent)' : 'var(--card-bg)',
            color: activeSource === 'all' ? '#fff' : 'var(--text)',
            fontWeight: activeSource === 'all' ? 600 : 400,
            border: activeSource === 'all' ? 'none' : '1px solid var(--border)',
          }}>Alle</div>
          {sources.map((s) => (
            <SourcePill key={s.id} source={s} active={activeSource === s.id}
              onClick={() => setActiveSource(s.id)} onRemove={() => removeSource(s.id)} />
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 32, flex: 1, overflowY: 'auto' }}>
        {activeErrors.length > 0 && (
          <div className="error-banner">
            {activeErrors.map(([id, msg]) => {
              const src = sources.find((s) => s.id === id);
              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span><strong>{src?.name || id}:</strong> {msg}</span>
                  <button onClick={() => refreshSource(id)} style={{
                    background: 'none', border: 'none', color: '#991b1b',
                    cursor: 'pointer', fontSize: 12, textDecoration: 'underline',
                  }}>Erneut</button>
                </div>
              );
            })}
          </div>
        )}

        {Object.entries(loading).filter(([, v]) => v).length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(loading).filter(([, v]) => v).map(([id]) => {
              const src = sources.find((s) => s.id === id);
              return (
                <div key={id} className="loading-pill">
                  <img src={FAVICON(extractDomain(src?.url || ''))} alt=""
                    style={{ width: 14, height: 14, borderRadius: 3 }}
                    onError={(e) => (e.target.style.display = 'none')} />
                  Lade {src?.name || '…'}
                </div>
              );
            })}
          </div>
        )}

        {sources.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 56, marginBottom: 20, filter: 'grayscale(1)', opacity: 0.4 }}>📰</div>
            <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
              Dein Pressespiegel ist leer
            </h2>
            <p style={{ fontSize: 15, maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
              Füge Nachrichtenwebseiten hinzu, um eine personalisierte Übersicht zu erhalten.
            </p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>
              + Erste Quelle hinzufügen
            </button>
          </div>
        ) : displayed.length === 0 && !isAnyLoading ? (
          <div className="empty-state" style={{ padding: 60 }}>
            Keine Artikel geladen. Klicke „Aktualisieren".
          </div>
        ) : (
          <div className="article-grid">
            {displayed.map((article) => (
              <ArticleCard key={article.id} article={article}
                onClick={() => setReaderArticle(article)} />
            ))}
          </div>
        )}
      </div>

      {showAddModal && <AddSourceModal onAdd={addSource} onClose={() => setShowAddModal(false)} />}

      <style jsx>{`
        .header {
          padding: 28px 32px 24px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
        }
        .logo {
          font-size: 28px; font-family: 'Libre Baskerville', serif;
          font-weight: 700; letter-spacing: -0.5px;
        }
        .subtitle { margin-top: 4px; font-size: 14px; color: var(--text-muted); }
        .pills-bar {
          padding: 16px 32px; display: flex; gap: 10px;
          overflow-x: auto; border-bottom: 1px solid var(--border);
        }
        .pill {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 100px;
          cursor: pointer; font-size: 14px;
          transition: all 0.2s ease; white-space: nowrap; flex-shrink: 0;
        }
        .article-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }
        .article-card {
          background: var(--card-bg); border-radius: 14px; padding: 24px;
          cursor: pointer; border: 1px solid var(--border);
          transition: all 0.25s ease;
          display: flex; flex-direction: column; gap: 10px;
        }
        .article-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .article-meta {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--text-muted);
        }
        .article-title {
          font-size: 17px; font-weight: 700; line-height: 1.35;
          font-family: 'Libre Baskerville', serif;
        }
        .article-summary {
          font-size: 14px; line-height: 1.6; color: var(--text-secondary);
          display: -webkit-box; -webkit-line-clamp: 3;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .paywall-badge {
          background: #fff3e0; color: #e65100;
          padding: 2px 8px; border-radius: 100px;
          font-size: 11px; font-weight: 600;
        }
        .reader { max-width: 720px; margin: 0 auto; padding: 32px 24px; font-family: 'Libre Baskerville', serif; }
        .back-btn {
          background: none; border: none; color: var(--accent);
          cursor: pointer; font-size: 15px; font-family: 'Source Sans 3', sans-serif;
          padding: 0; margin-bottom: 32px;
        }
        .reader-meta {
          font-size: 12px; color: var(--text-muted); margin-bottom: 12px;
          font-family: 'Source Sans 3', sans-serif;
          display: flex; align-items: center; gap: 8px;
        }
        .reader-title { font-size: 28px; font-weight: 700; line-height: 1.3; margin-bottom: 16px; }
        .original-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--accent);
          font-family: 'Source Sans 3', sans-serif;
          margin-bottom: 32px; text-decoration: none;
        }
        .reader-content { border-top: 1px solid var(--border); padding-top: 32px; }
        .reader-text { font-size: 17px; line-height: 1.85; color: var(--text-secondary); white-space: pre-wrap; }
        .loading-text {
          text-align: center; padding: 60px; color: var(--text-muted);
          font-size: 14px; font-family: 'Source Sans 3', sans-serif;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .error-box {
          text-align: center; padding: 40px; color: #e65100;
          background: #fff3e0; border-radius: 12px;
          font-family: 'Source Sans 3', sans-serif; font-size: 15px;
        }
        .error-banner {
          margin-bottom: 24px; padding: 16px 20px; border-radius: 12px;
          background: #fef2f2; border: 1px solid #fecaca;
          font-size: 13px; color: #991b1b;
        }
        .loading-pill {
          padding: 8px 16px; border-radius: 100px;
          background: #f0f9ff; border: 1px solid #bae6fd;
          font-size: 13px; color: #0369a1;
          animation: pulse 1.5s ease-in-out infinite;
          display: flex; align-items: center; gap: 8px;
        }
        .empty-state { text-align: center; padding: 80px 24px; color: var(--text-muted); }
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(4px);
        }
        .modal {
          background: var(--bg); border-radius: 16px; padding: 32px;
          width: 90%; max-width: 460px; border: 1px solid var(--border);
          box-shadow: 0 24px 48px rgba(0,0,0,0.15);
        }
        .input-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
        .input-field {
          width: 100%; padding: 12px 16px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--card-bg);
          color: var(--text); font-size: 15px; outline: none;
        }
        .btn-primary {
          padding: 10px 20px; border-radius: 10px; border: none;
          background: var(--accent); color: #fff; font-size: 14px;
          font-weight: 600; cursor: pointer; flex: 1;
        }
        .btn-secondary {
          padding: 10px 20px; border-radius: 10px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); font-size: 14px; cursor: pointer; flex: 1;
        }
      `}</style>
    </div>
  );
}
