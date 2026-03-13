import React, { useState, useCallback } from "react";
import NewsCard from "../components/NewsCard";
import { searchArticles } from "../api/client";
import type { NewsArticle } from "../types";
import toast from "react-hot-toast";

const INDIA_TAGS  = ["LABOUR","FARMERS","DALIT","ELECTIONS","CORPORATE","STATE VIOLENCE","HOUSING","EDUCATION","ENVIRONMENT","HEALTH","GENDER","MINORITIES","ADIVASI","COMMUNALISM","PRIVATISATION","MEDIA"];
const WORLD_TAGS  = ["WAR & CONFLICT","IMPERIALISM","SANCTIONS","MOU","INDIA-BILATERAL","DIPLOMACY","CLIMATE","COUP","PROTEST","ECONOMIC POLICY","REFUGEES","NUCLEAR","TRADE","SOLIDARITY"];

const Search: React.FC = () => {
  const [query,    setQuery]    = useState("");
  const [tag,      setTag]      = useState("");
  const [section,  setSection]  = useState("");
  const [country,  setCountry]  = useState("");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const allTags = section === "world" ? WORLD_TAGS : section === "india" ? INDIA_TAGS : [...INDIA_TAGS, ...WORLD_TAGS];

  const doSearch = useCallback(async (p = 1) => {
    if (!query.trim() && !tag && !section && !country) {
      toast.error("Enter a keyword, tag, section, or country to search");
      return;
    }
    setLoading(true);
    try {
      const res = await searchArticles({ q: query, tag, section, country, page: p, per_page: 24 });
      setArticles(res.articles);
      setTotal(res.total);
      setPage(res.page);
      setPages(res.pages);
      setSearched(true);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, tag, section, country]);

  return (
    <div className="page-container">
      <div className="search-panel">
        <h2 className="section-title">☭ Search All Saved News</h2>
        <div className="search-row">
          <div className="fetch-group" style={{ flex: 2 }}>
            <label className="fetch-label">Keyword</label>
            <input
              type="text"
              placeholder="e.g. Modi, Palestine, TNAU, farmers, MoU…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch(1)}
            />
          </div>
          <div className="fetch-group">
            <label className="fetch-label">Section</label>
            <select value={section} onChange={e => { setSection(e.target.value); setTag(""); }}>
              <option value="">All Sections</option>
              <option value="india">India / Tamil Nadu</option>
              <option value="world">World News</option>
            </select>
          </div>
          <div className="fetch-group">
            <label className="fetch-label">Tag</label>
            <select value={tag} onChange={e => setTag(e.target.value)}>
              <option value="">All Tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {section === "world" && (
            <div className="fetch-group">
              <label className="fetch-label">Country</label>
              <input
                type="text"
                placeholder="e.g. Palestine, Brazil…"
                value={country}
                onChange={e => setCountry(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch(1)}
              />
            </div>
          )}
          <div className="fetch-btn-group">
            <button className="btn btn-primary" onClick={() => doSearch(1)} disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      </div>

      {searched && !loading && (
        <p className="search-result-count mono">
          {total} article{total !== 1 ? "s" : ""} found
          {query && <> for "<strong>{query}</strong>"</>}
          {tag && <> tagged <strong>{tag}</strong></>}
          {country && <> in <strong>{country}</strong></>}
        </p>
      )}

      {!loading && articles.length === 0 && searched && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No Results</h3>
          <p>Try different keywords, tags, or remove filters.</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="empty-state">
          <span className="empty-icon">☭</span>
          <h3>Search the Archive</h3>
          <p>Search across all saved India, Tamil Nadu, and World news — headlines, summaries, and Red Lens analyses.</p>
        </div>
      )}

      {articles.length > 0 && (
        <>
          <div className="news-grid">
            {articles.map((a, i) => (
              <NewsCard key={a.id} article={a} animDelay={i * 0.03} />
            ))}
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary" disabled={page <= 1} onClick={() => doSearch(page - 1)}>← Prev</button>
              <span className="mono" style={{ fontSize:"0.8rem" }}>Page {page} of {pages}</span>
              <button className="btn btn-secondary" disabled={page >= pages} onClick={() => doSearch(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
