import React, { useState, useCallback } from "react";
import NewsCard from "../components/NewsCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchWorldNews } from "../api/client";
import type { NewsArticle, Topic, Depth } from "../types";
import { WORLD_TOPIC_OPTIONS, DEPTH_OPTIONS, WORLD_REGIONS } from "../types";
import toast from "react-hot-toast";

const LOADING_MSGS = [
  "SCANNING IMPERIALIST PRESS FOR ANTI-CAPITALIST TRUTHS…",
  "MAPPING GLOBAL CLASS STRUGGLES…",
  "IDENTIFYING MoUs, TREATIES & BILATERAL AGREEMENTS…",
  "ANALYSING WARS THROUGH A MATERIALIST LENS…",
  "TRACING FINANCE CAPITAL ACROSS CONTINENTS…",
  "CENTERING GLOBAL SOUTH WORKING CLASS…",
];

// Group articles by country/region for display
function groupByCountry(articles: NewsArticle[]): Record<string, NewsArticle[]> {
  return articles.reduce((acc, a) => {
    const key = a.country || a.region || "World";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {} as Record<string, NewsArticle[]>);
}

// Separate MoU / India-bilateral articles
function extractMous(articles: NewsArticle[]): [NewsArticle[], NewsArticle[]] {
  const mouTags = ["MOU","INDIA-BILATERAL","DIPLOMACY"];
  const mous    = articles.filter(a => mouTags.includes(a.tag?.toUpperCase()));
  const rest    = articles.filter(a => !mouTags.includes(a.tag?.toUpperCase()));
  return [mous, rest];
}

const WorldNews: React.FC = () => {
  const [articles,    setArticles]    = useState<NewsArticle[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [fromCache,   setFromCache]   = useState<boolean | undefined>(undefined);
  const [topic,       setTopic]       = useState<Topic>("all");
  const [depth,       setDepth]       = useState<Depth>("standard");
  const [filterRegion,setFilterRegion]= useState("");
  const [groupByReg,  setGroupByReg]  = useState(true);
  const [loadMsg,     setLoadMsg]     = useState(LOADING_MSGS[0]);

  const handleFetch = useCallback(async (force = false) => {
    setLoading(true);
    let mi = 0;
    const iv = setInterval(() => {
      mi = (mi + 1) % LOADING_MSGS.length;
      setLoadMsg(LOADING_MSGS[mi]);
    }, 2200);

    try {
      const res = await fetchWorldNews({ topic, depth, force_refresh: force });
      setArticles(res.session.articles || []);
      setFromCache(res.from_cache);
      const count = res.session.articles?.length ?? 0;
      if (res.from_cache) toast("Loaded from today's cache", { icon: "📋" });
      else toast.success(`Fetched ${count} world news articles`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch world news");
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  }, [topic, depth]);

  const handleBookmarkChange = useCallback((id: number, val: boolean) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, is_bookmarked: val } : a));
  }, []);

  // Filter by region
  const filtered = filterRegion
    ? articles.filter(a =>
        (a.country || a.region || "").toLowerCase().includes(filterRegion.toLowerCase())
      )
    : articles;

  const [mous, rest] = extractMous(filtered);
  const grouped = groupByReg ? groupByCountry(rest) : {};

  const mouCount     = mous.length;
  const totalFiltered = filtered.length;

  return (
    <div className="page-container">

      {/* Fetch panel */}
      <div className="fetch-panel" style={{ borderColor: "#1a3a5c", boxShadow: "4px 4px 0 #eaf2ff" }}>
        <h2 className="fetch-panel-title" style={{ color: "#1a3a5c" }}>
          🌐 World News — Communist International Perspective
        </h2>
        <div className="fetch-row">
          <div className="fetch-group">
            <label className="fetch-label">Topic Filter</label>
            <select value={topic} onChange={e => setTopic(e.target.value as Topic)}>
              {WORLD_TOPIC_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="fetch-group">
            <label className="fetch-label">Analysis Depth</label>
            <select value={depth} onChange={e => setDepth(e.target.value as Depth)}>
              {DEPTH_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="fetch-btn-group">
            <button
              className="btn"
              style={{ background:"#1a3a5c", color:"white" }}
              onClick={() => handleFetch(false)}
              disabled={loading}
            >
              {loading ? "Fetching…" : "Fetch World News"}
            </button>
            {fromCache !== undefined && (
              <button className="btn btn-secondary" onClick={() => handleFetch(true)} disabled={loading}>
                ↺ Refresh
              </button>
            )}
          </div>
        </div>
        {fromCache && (
          <p className="cache-notice">Showing cached results for today. Click Refresh to re-fetch.</p>
        )}
      </div>

      {loading && (
        <div className="loading-box">
          <div className="spinner" style={{ borderTopColor: "#1a3a5c", borderColor: "#eaf2ff" }} />
          <p className="loading-msg" style={{ color: "#1a3a5c" }}>{loadMsg}</p>
        </div>
      )}

      {!loading && articles.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🌐</span>
          <h3>No World News Loaded</h3>
          <p>
            Click <strong>Fetch World News</strong> to collect today's international political news —
            covering all world regions plus India's bilateral agreements and MoUs.
          </p>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <>
          {/* Stats + filter bar */}
          <div className="world-filter-bar">
            <div className="world-stats mono">
              <span>{totalFiltered} articles</span>
              {mouCount > 0 && (
                <span className="mou-badge">✦ {mouCount} MoU / Bilateral</span>
              )}
            </div>
            <div className="world-filter-controls">
              <select
                value={filterRegion}
                onChange={e => setFilterRegion(e.target.value)}
                style={{ maxWidth: 180 }}
              >
                <option value="">All Regions</option>
                {WORLD_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={groupByReg}
                  onChange={e => setGroupByReg(e.target.checked)}
                />
                Group by country
              </label>
            </div>
          </div>

          {/* MoU / Bilateral section — always on top if present */}
          {mous.length > 0 && (
            <section className="world-section">
              <div className="world-section-header" style={{ background:"#c9a84c", color:"#1a0a08" }}>
                <span>✦ MoUs & India Bilateral Agreements</span>
                <span className="mono" style={{ fontSize:"0.7rem" }}>{mous.length} items</span>
              </div>
              <div className="news-grid">
                {mous.map((a, i) => (
                  <NewsCard key={a.id} article={a} onBookmarkChange={handleBookmarkChange} animDelay={i * 0.05} />
                ))}
              </div>
            </section>
          )}

          {/* Grouped by country */}
          {groupByReg ? (
            Object.entries(grouped).map(([country, arts]) => (
              <section key={country} className="world-section">
                <div className="world-section-header">
                  <span>{country.toUpperCase()}</span>
                  <span className="mono" style={{ fontSize:"0.7rem" }}>{arts.length} article{arts.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="news-grid">
                  {arts.map((a, i) => (
                    <NewsCard key={a.id} article={a} onBookmarkChange={handleBookmarkChange} animDelay={i * 0.04} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="news-grid">
              {rest.map((a, i) => (
                <NewsCard key={a.id} article={a} onBookmarkChange={handleBookmarkChange} animDelay={i * 0.04} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorldNews;
