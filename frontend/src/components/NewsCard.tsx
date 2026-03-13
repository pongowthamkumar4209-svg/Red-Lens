import React, { useState } from "react";
import { toggleBookmark } from "../api/client";
import type { NewsArticle } from "../types";
import toast from "react-hot-toast";

const TAG_COLORS: Record<string, string> = {
  LABOUR:"#e67e22", FARMERS:"#27ae60", DALIT:"#8e44ad",
  ELECTIONS:"#2980b9", CORPORATE:"#c0392b", "STATE VIOLENCE":"#1a1a1a",
  HOUSING:"#16a085", EDUCATION:"#f39c12", ENVIRONMENT:"#27ae60",
  HEALTH:"#2980b9", HEALTHCARE:"#2980b9", GENDER:"#c0392b",
  MINORITIES:"#8e44ad", COMMUNALISM:"#922b21", ADIVASI:"#1e8449",
  PRIVATISATION:"#c0392b", MEDIA:"#6c3483", ECONOMY:"#2471a3",
  POLITICS:"#c0392b",
  "WAR & CONFLICT":"#922b21", IMPERIALISM:"#7b241c",
  SANCTIONS:"#884ea0", MOU:"#1a5276", "INDIA-BILATERAL":"#1a5276",
  DIPLOMACY:"#1a5276", CLIMATE:"#1e8449", SOLIDARITY:"#e74c3c",
  COUP:"#1a1a1a", PROTEST:"#e67e22", "ECONOMIC POLICY":"#c0392b",
  REFUGEES:"#884ea0", NUCLEAR:"#922b21", TRADE:"#1a5276",
};

interface Props {
  article: NewsArticle;
  onBookmarkChange?: (id: number, val: boolean) => void;
  animDelay?: number;
}

const NewsCard: React.FC<Props> = ({ article, onBookmarkChange, animDelay = 0 }) => {
  const [bookmarked, setBookmarked] = useState(article.is_bookmarked);
  const [toggling,   setToggling]   = useState(false);

  const isWorld = article.section === "world";
  const isMou   = ["MOU","INDIA-BILATERAL","DIPLOMACY"].includes(article.tag?.toUpperCase());
  const tagColor= TAG_COLORS[article.tag?.toUpperCase()] || (isWorld ? "#1a5276" : "#c0392b");
  const barBg   = isWorld ? "#1a3a5c" : "#c0392b";

  const handleBookmark = async (e: React.MouseEvent) => {
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

  const regionLabel = isWorld
    ? (article.country || article.region || "World")
    : (article.region || "India");

  return (
    <div className="news-card" style={{
      animationDelay: `${animDelay}s`,
      borderTop: isMou ? "3px solid #c9a84c" : undefined,
    }}>
      {isMou && (
        <div style={{
          background:"#c9a84c",color:"#1a0a08",
          fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.6rem",
          letterSpacing:"2px",padding:"3px 14px",fontWeight:600,
        }}>✦ MOU / BILATERAL AGREEMENT</div>
      )}

      <div className="card-region-bar" style={{ background: barBg }}>
        <span className="card-region-label">{regionLabel.toUpperCase()}</span>
        <span className="card-tag" style={{ background: tagColor }}>{article.tag}</span>
      </div>

      <div className="card-body">
        {/* Headline — clickable if source_url exists */}
        {article.source_url ? (
          <a href={article.source_url} target="_blank" rel="noopener noreferrer"
            className="card-headline-link">
            <h3 className="card-headline">{article.headline}</h3>
          </a>
        ) : (
          <h3 className="card-headline">{article.headline}</h3>
        )}

        <p className="card-summary">{article.summary}</p>

        <div className="red-lens-box" style={{
          background: isWorld ? "#eaf2ff" : "#fdecea",
          borderLeftColor: isWorld ? "#1a3a5c" : "#c0392b",
        }}>
          <div className="red-lens-label" style={{ color: isWorld ? "#1a3a5c" : "#c0392b" }}>
            {isWorld ? "🌐 Red Lens — International Analysis" : "☭ Red Lens Analysis"}
          </div>
          <p className="red-lens-text" style={{ color: isWorld ? "#1a3a5c" : "#7b241c" }}>
            {article.red_lens}
          </p>
        </div>
      </div>

      <div className="card-footer">
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          <span className="card-source">{article.source}</span>
          {article.source_url && (
            <a href={article.source_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:"0.6rem", color:"var(--red)", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"1px" }}>
              Read original ↗
            </a>
          )}
        </div>
        <div className="card-footer-right">
          <span className="card-time">{article.article_time}</span>
          <button
            className={`bookmark-btn ${bookmarked ? "bookmarked" : ""}`}
            onClick={handleBookmark} disabled={toggling}
            title={bookmarked ? "Remove bookmark" : "Bookmark"}
          >{bookmarked ? "★" : "☆"}</button>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
