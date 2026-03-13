import React, { useState, useCallback } from "react";
import NewsCard from "../components/NewsCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchOtherNews, toggleBookmark } from "../api/client";
import type { NewsArticle } from "../types";
import toast from "react-hot-toast";

type Scope    = "india" | "world";
type Category = "all" | "SPORTS" | "CINEMA" | "ECONOMY" | "TECHNOLOGY" | "SCIENCE" | "HEALTH" | "ENVIRONMENT" | "EDUCATION";
type Depth    = "brief" | "standard" | "deep";

const SCOPES: { value: Scope; label: string; flag: string }[] = [
  { value: "india", label: "India", flag: "🇮🇳" },
  { value: "world", label: "World", flag: "🌐"  },
];

const CATEGORIES: { value: Category; label: string; icon: string; color: string }[] = [
  { value: "all",         label: "All",         icon: "◈",  color: "#555"    },
  { value: "SPORTS",      label: "Sports",      icon: "⚽",  color: "#1a7a3a" },
  { value: "CINEMA",      label: "Cinema",      icon: "🎬",  color: "#7b2d8b" },
  { value: "ECONOMY",     label: "Economy",     icon: "📈",  color: "#c0392b" },
  { value: "TECHNOLOGY",  label: "Technology",  icon: "💻",  color: "#1a5276" },
  { value: "SCIENCE",     label: "Science",     icon: "🔬",  color: "#0e6655" },
  { value: "HEALTH",      label: "Health",      icon: "❤️",  color: "#922b21" },
  { value: "ENVIRONMENT", label: "Environment", icon: "🌿",  color: "#1d8348" },
  { value: "EDUCATION",   label: "Education",   icon: "📚",  color: "#9b59b6" },
];

const DEPTHS: { value: Depth; label: string }[] = [
  { value: "brief",    label: "Brief"    },
  { value: "standard", label: "Standard" },
  { value: "deep",     label: "Deep"     },
];

const CAT_COLORS: Record<string, string> = {
  SPORTS:"#1a7a3a", CRICKET:"#1a7a3a", FOOTBALL:"#1a7a3a", TENNIS:"#1a7a3a", OLYMPICS:"#1a7a3a",
  CINEMA:"#7b2d8b", BOLLYWOOD:"#7b2d8b", KOLLYWOOD:"#7b2d8b", OTT:"#7b2d8b",
  ECONOMY:"#c0392b", MARKETS:"#c0392b", BUDGET:"#c0392b", STARTUP:"#c0392b",
  TECHNOLOGY:"#1a5276", AI:"#1a5276",
  SCIENCE:"#0e6655",
  HEALTH:"#922b21",
  ENVIRONMENT:"#1d8348",
  EDUCATION:"#9b59b6",
};

/* ── Inline card with per-category colour ─────────────────────────────────── */
interface CardProps {
  article: NewsArticle & { category?: string };
  barColor: string;
  onBookmarkChange?: (id: number, val: boolean) => void;
  animDelay?: number;
}

const OtherCard: React.FC<CardProps> = ({ article, barColor, onBookmarkChange, animDelay = 0 }) => {
  const [bookmarked, setBookmarked] = useState(article.is_bookmarked);
  const [toggling,   setToggling]   = useState(false);

  const handleBm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    try {
      const res = await toggleBookmark(article.id);
      setBookmarked(res.is_bookmarked);
      onBookmarkChange?.(article.id, res.is_bookmarked);
      toast.success(res.is_bookmarked ? "Bookmarked" : "Removed");
    } catch { toast.error("Failed"); }
    finally { setToggling(false); }
  };

  return (
    <div className="news-card" style={{ animationDelay: `${animDelay}s` }}>
      <div className="card-region-bar" style={{ background: `linear-gradient(90deg,${barColor},${barColor}cc)` }}>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"0.62rem", letterSpacing:"2.5px" }}>
          {article.region?.toUpperCase()}
        </span>
        <span className="card-tag">{article.tag}</span>
      </div>
      <div className="card-body">
        {article.source_url ? (
          <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="card-headline-link">
            <h3 className="card-headline">{article.headline}</h3>
          </a>
        ) : (
          <h3 className="card-headline">{article.headline}</h3>
        )}
        <p className="card-summary">{article.summary}</p>
        {article.red_lens && article.red_lens !== "Analysis pending." && (
          <div className="red-lens-box" style={{ background:`${barColor}12`, borderLeftColor:barColor }}>
            <div className="red-lens-label" style={{ color:barColor }}>◈ Red Lens Note</div>
            <p className="red-lens-text" style={{ color:barColor }}>{article.red_lens}</p>
          </div>
        )}
      </div>
      <div className="card-footer">
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          <span className="card-source" style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"0.65rem", letterSpacing:"1px", color:"var(--mid)" }}>
            {article.source}
          </span>
          {article.source_url && (
            <a href={article.source_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:"0.6rem", color:barColor, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"1px" }}>
              Read original ↗
            </a>
          )}
        </div>
        <div className="card-footer-right">
          <span className="card-time">{article.article_time}</span>
          <button className={`bookmark-btn ${bookmarked ? "bookmarked" : ""}`}
            onClick={handleBm} disabled={toggling}>
            {bookmarked ? "★" : "☆"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ────────────────────────────────────────────────────────────── */
const OtherNews: React.FC = () => {
  const [scope,     setScope]     = useState<Scope>("india");
  const [category,  setCategory]  = useState<Category>("all");
  const [depth,     setDepth]     = useState<Depth>("brief");
  const [articles,  setArticles]  = useState<(NewsArticle & { category?: string })[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [fromCache, setFromCache] = useState<boolean | undefined>(undefined);

  const handleFetch = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetchOtherNews({ scope, category, depth, force_refresh: force });
      setArticles(res.session.articles || []);
      setFromCache(res.from_cache);
      if (res.from_cache) toast("Loaded from today's cache", { icon: "📋" });
      else toast.success(`Fetched ${res.session.articles?.length ?? 0} articles`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [scope, category, depth]);

  const handleBookmarkChange = useCallback((id: number, val: boolean) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, is_bookmarked: val } : a));
  }, []);

  // Group by category when "all"
  const grouped = React.useMemo(() => {
    if (category !== "all") return null;
    const map: Record<string, (NewsArticle & { category?: string })[]> = {};
    for (const a of articles) {
      const key = a.category || a.tag || "OTHER";
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [articles, category]);

  const activeCat = CATEGORIES.find(c => c.value === category);

  return (
    <div className="page-container">

      {/* ── Fetch Panel ── */}
      <div className="fetch-panel" style={{ marginBottom: 32 }}>
        <h2 className="fetch-panel-title">
          <span>◈</span> Other News — Sports · Cinema · Economy · Tech · Science · Health
        </h2>

        {/* India / World toggle */}
        <div style={{ display:"flex", gap:10, marginBottom:18 }}>
          {SCOPES.map(s => (
            <button key={s.value} onClick={() => { setScope(s.value); setArticles([]); setFromCache(undefined); }}
              className="btn"
              style={{
                background: scope === s.value ? "linear-gradient(135deg,#1a3a5c,#0f2540)" : "rgba(255,255,255,0.7)",
                color:  scope === s.value ? "white" : "#555",
                border: scope === s.value ? "none" : "1px solid rgba(0,0,0,0.12)",
                padding:"8px 22px", borderRadius:8, fontSize:"0.8rem",
                boxShadow: scope === s.value ? "0 4px 14px rgba(26,58,92,0.3)" : "none",
              }}>
              {s.flag} {s.label}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {CATEGORIES.map(c => (
            <button key={c.value}
              onClick={() => { setCategory(c.value); setArticles([]); setFromCache(undefined); }}
              className="btn"
              style={{
                background: category === c.value ? c.color : "rgba(255,255,255,0.65)",
                color:      category === c.value ? "white" : "#666",
                border:     category === c.value ? "none" : "1px solid rgba(0,0,0,0.1)",
                fontSize:"0.72rem", padding:"6px 16px", borderRadius:20, letterSpacing:"1.5px",
                backdropFilter:"blur(8px)",
                boxShadow: category === c.value ? `0 4px 12px ${c.color}55` : "none",
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Depth + Fetch button */}
        <div className="fetch-row">
          <div className="fetch-group" style={{ maxWidth:200 }}>
            <label className="fetch-label">Analysis Depth</label>
            <select value={depth} onChange={e => setDepth(e.target.value as Depth)}>
              {DEPTHS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="fetch-btn-group">
            <button className="btn btn-primary" onClick={() => handleFetch(false)} disabled={loading}>
              {loading ? "Fetching…" : `${activeCat?.icon || "◈"} Fetch ${activeCat?.label || "News"}`}
            </button>
            {fromCache !== undefined && (
              <button className="btn btn-secondary" onClick={() => handleFetch(true)} disabled={loading}>
                ↺ Refresh
              </button>
            )}
          </div>
        </div>

        {fromCache && <p className="cache-notice">Showing cached results for today. Click Refresh to re-fetch.</p>}
      </div>

      {/* ── States ── */}
      {loading && <LoadingSpinner />}

      {!loading && articles.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon" style={{ fontSize:"2.5rem", display:"block", marginBottom:14, opacity:0.25 }}>◈</span>
          <h3>No News Loaded</h3>
          <p>
            Choose <strong>India</strong> or <strong>World</strong>, pick a category,
            then click Fetch to load today's news.
          </p>
        </div>
      )}

      {/* Grouped — "all" view */}
      {!loading && grouped && Object.keys(grouped).length > 0 &&
        Object.entries(grouped).map(([cat, items]) => {
          const meta     = CATEGORIES.find(c => c.value === cat);
          const barColor = CAT_COLORS[cat] || "#555";
          return (
            <div key={cat} className="world-section">
              <div className="world-section-header"
                style={{ background:`linear-gradient(90deg,${barColor},${barColor}cc)` }}>
                <span>{meta?.icon || "◈"} {cat}</span>
                <span style={{ opacity:0.7, fontSize:"0.65rem" }}>{items.length} articles</span>
              </div>
              <div className="news-grid">
                {items.map((a, i) => (
                  <OtherCard key={a.id} article={a} barColor={barColor}
                    onBookmarkChange={handleBookmarkChange} animDelay={i * 0.05} />
                ))}
              </div>
            </div>
          );
        })
      }

      {/* Single-category flat view */}
      {!loading && !grouped && articles.length > 0 && (
        <div className="news-grid">
          {articles.map((a, i) => (
            <OtherCard key={a.id} article={a}
              barColor={CAT_COLORS[a.tag] || activeCat?.color || "#555"}
              onBookmarkChange={handleBookmarkChange} animDelay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
};

export default OtherNews;
