import React, { useState, useEffect, useCallback } from "react";
import NewsCard from "../components/NewsCard";
import { getBookmarks } from "../api/client";
import type { NewsArticle } from "../types";
import toast from "react-hot-toast";

const Bookmarks: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"all"|"india"|"world">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookmarks();
      setArticles(data);
    } catch {
      toast.error("Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBookmarkChange = useCallback((id: number, val: boolean) => {
    if (!val) setArticles(prev => prev.filter(a => a.id !== id));
  }, []);

  const filtered = tab === "all" ? articles : articles.filter(a => a.section === tab);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="section-title">☭ Bookmarked Articles</h2>
        {articles.length > 0 && (
          <span className="mono" style={{ fontSize:"0.75rem", color:"var(--mid)" }}>
            {articles.length} saved
          </span>
        )}
      </div>

      {articles.length > 0 && (
        <div className="tabs-row">
          {(["all","india","world"] as const).map(t => (
            <button
              key={t}
              className={`tab-pill ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "all" ? "All" : t === "india" ? "India / TN" : "World"}
              <span className="tab-pill-count">
                {t === "all" ? articles.length : articles.filter(a => a.section === t).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="loading-text mono">Loading bookmarks…</p>}

      {!loading && articles.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">★</span>
          <h3>No Bookmarks Yet</h3>
          <p>Click ☆ on any article to bookmark it for reference.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="news-grid">
          {filtered.map((a, i) => (
            <NewsCard key={a.id} article={a} onBookmarkChange={handleBookmarkChange} animDelay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;
