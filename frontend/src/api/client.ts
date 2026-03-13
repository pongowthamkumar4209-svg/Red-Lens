import axios from "axios";
import type {
  FetchNewsParams, FetchWorldParams, FetchNewsResponse,
  NewsSession, SessionsResponse, SearchResponse, NewsArticle,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 300000, // 5 minutes — RSS fetch + multiple Claude batches can take 2-3 mins
});

export const fetchNews = (params: FetchNewsParams): Promise<FetchNewsResponse> =>
  api.post("/api/fetch-news", params).then(r => r.data);

export const fetchWorldNews = (params: FetchWorldParams): Promise<FetchNewsResponse> =>
  api.post("/api/fetch-world-news", params).then(r => r.data);

export const listSessions = (params?: { page?: number; per_page?: number; section?: string }): Promise<SessionsResponse> =>
  api.get("/api/sessions", { params }).then(r => r.data);

export const getSession = (id: number): Promise<NewsSession> =>
  api.get(`/api/sessions/${id}`).then(r => r.data);

export const deleteSession = (id: number) =>
  api.delete(`/api/sessions/${id}`).then(r => r.data);

export const getSessionsByDate = (date: string, section?: string): Promise<NewsSession[]> =>
  api.get(`/api/sessions/date/${date}`, { params: section ? { section } : {} }).then(r => r.data);

export const getAvailableDates = (section?: string): Promise<{ dates: string[] }> =>
  api.get("/api/sessions/dates", { params: section ? { section } : {} }).then(r => r.data);

export const toggleBookmark = (id: number): Promise<{ id: number; is_bookmarked: boolean }> =>
  api.patch(`/api/articles/${id}/bookmark`).then(r => r.data);

export const getBookmarks = (section?: string): Promise<NewsArticle[]> =>
  api.get("/api/articles/bookmarks", { params: section ? { section } : {} }).then(r => r.data);

export const searchArticles = (params: {
  q?: string; tag?: string; section?: string; country?: string; page?: number; per_page?: number;
}): Promise<SearchResponse> =>
  api.get("/api/articles/search", { params }).then(r => r.data);

export const healthCheck = () =>
  api.get("/api/health").then(r => r.data);

export const fetchOtherNews = (params: {
  scope: string; category: string; depth: string; force_refresh?: boolean;
}): Promise<FetchNewsResponse> =>
  api.post("/api/fetch-other-news", params).then(r => r.data);
