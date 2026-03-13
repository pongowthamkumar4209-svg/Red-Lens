import React, { useState, useCallback } from "react";
import FetchPanel from "../components/FetchPanel";
import NewsCard from "../components/NewsCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchNews } from "../api/client";
import type { NewsArticle, Region, Topic, Depth } from "../types";
import toast from "react-hot-toast";

const Today: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState<boolean | undefined>(undefined);

  const handleFetch = useCallback(
    async (region: Region, topic: Topic, depth: Depth, forceRefresh: boolean) => {
      setLoading(true);
      try {
        const res = await fetchNews({ region, topic, depth, force_refresh: forceRefresh });
        setArticles(res.session.articles || []);
        setFromCache(res.from_cache);
        if (res.from_cache) {
          toast("Loaded from today's cache", { icon: "📋" });
        } else {
          toast.success(`Fetched ${res.session.articles?.length ?? 0} articles`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to fetch news";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleBookmarkChange = useCallback((id: number, val: boolean) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_bookmarked: val } : a))
    );
  }, []);

  return (
    <div className="page-container">
      <FetchPanel onFetch={handleFetch} loading={loading} fromCache={fromCache} />

      {loading && <LoadingSpinner />}

      {!loading && articles.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">☭</span>
          <h3>No News Loaded Yet</h3>
          <p>
            Select your region and topic, then click{" "}
            <strong>Fetch & Analyse</strong> to collect today's political news
            and view it through a communist analytical lens.
          </p>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="news-grid">
          {articles.map((article, i) => (
            <NewsCard
              key={article.id}
              article={article}
              onBookmarkChange={handleBookmarkChange}
              animDelay={i * 0.06}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Today;
