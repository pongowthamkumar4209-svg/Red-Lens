import React, { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import NewsCard from "../components/NewsCard";
import { getAvailableDates, getSessionsByDate } from "../api/client";
import type { NewsArticle, NewsSession } from "../types";
import toast from "react-hot-toast";

type CalendarValue = Date | null | [Date | null, Date | null];

const Archive: React.FC = () => {
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sessions, setSessions] = useState<NewsSession[]>([]);
  const [activeSession, setActiveSession] = useState<NewsSession | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // Load available dates on mount
  useEffect(() => {
    getAvailableDates()
      .then((res) => setAvailableDates(new Set(res.dates)))
      .catch(() => toast.error("Failed to load archive dates"))
      .finally(() => setLoadingDates(false));
  }, []);

  const handleDateChange = useCallback(async (value: CalendarValue) => {
    const d = Array.isArray(value) ? value[0] : value;
    if (!d) return;
    const dateStr = format(d, "yyyy-MM-dd");
    setSelectedDate(dateStr);
    setSessions([]);
    setArticles([]);
    setActiveSession(null);
    setLoadingArticles(true);
    try {
      const sArr = await getSessionsByDate(dateStr);
      setSessions(sArr);
      if (sArr.length > 0) {
        setActiveSession(sArr[0]);
        setArticles(sArr[0].articles || []);
      }
    } catch {
      toast.error("Failed to load sessions for this date");
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  const selectSession = (s: NewsSession) => {
    setActiveSession(s);
    setArticles(s.articles || []);
  };

  const tileClassName = ({ date }: { date: Date }) => {
    const ds = format(date, "yyyy-MM-dd");
    return availableDates.has(ds) ? "has-news" : null;
  };

  return (
    <div className="page-container">
      <div className="archive-layout">
        {/* Left: Calendar */}
        <div className="archive-sidebar">
          <h2 className="section-title">☭ News Archive</h2>
          <p className="archive-hint">
            Dates highlighted in red have saved news. Click to browse.
          </p>
          {loadingDates ? (
            <p className="mono" style={{ fontSize: "0.75rem", color: "var(--mid)" }}>Loading dates…</p>
          ) : (
            <Calendar
              onChange={handleDateChange}
              tileClassName={tileClassName}
              maxDate={new Date()}
            />
          )}

          {/* Session tabs for selected date */}
          {sessions.length > 1 && (
            <div className="session-tabs">
              <p className="fetch-label" style={{ marginBottom: 8 }}>
                {sessions.length} sessions on {selectedDate}
              </p>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className={`session-tab-btn ${activeSession?.id === s.id ? "active" : ""}`}
                  onClick={() => selectSession(s)}
                >
                  {s.region} / {s.topic}
                  <span>{s.article_count} articles</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Articles */}
        <div className="archive-content">
          {!selectedDate && (
            <div className="empty-state">
              <span className="empty-icon">📅</span>
              <h3>Select a Date</h3>
              <p>Click a highlighted date on the calendar to browse saved news.</p>
            </div>
          )}

          {selectedDate && loadingArticles && (
            <p className="loading-text mono">Loading sessions…</p>
          )}

          {selectedDate && !loadingArticles && sessions.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">☭</span>
              <h3>No News for {selectedDate}</h3>
              <p>No sessions were saved on this date.</p>
            </div>
          )}

          {!loadingArticles && articles.length > 0 && (
            <>
              <div className="archive-meta">
                <span className="mono" style={{ fontSize: "0.75rem", color: "var(--mid)" }}>
                  {selectedDate} · {activeSession?.region} · {activeSession?.topic} · {articles.length} articles
                </span>
              </div>
              <div className="news-grid">
                {articles.map((a, i) => (
                  <NewsCard key={a.id} article={a} animDelay={i * 0.05} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
