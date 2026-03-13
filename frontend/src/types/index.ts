export interface NewsArticle {
  id: number;
  session_id: number;
  section: "india" | "world";
  region: string;
  country: string;
  tag: string;
  headline: string;
  summary: string;
  red_lens: string;
  source: string;
  source_url: string;
  article_time: string;
  is_bookmarked: boolean;
  date: string;
  created_at: string;
}

export interface NewsSession {
  id: number;
  date: string;
  section: "india" | "world";
  region: string;
  topic: string;
  depth: string;
  created_at: string;
  article_count: number;
  articles?: NewsArticle[];
}

export interface FetchNewsParams   { region: string; topic: string; depth: string; force_refresh?: boolean; }
export interface FetchWorldParams  { topic: string; depth: string; force_refresh?: boolean; }
export interface FetchNewsResponse { session: NewsSession; from_cache: boolean; }
export interface SessionsResponse  { sessions: NewsSession[]; total: number; page: number; pages: number; }
export interface SearchResponse    { articles: NewsArticle[]; total: number; page: number; pages: number; }

export type Region = "both" | "india" | "tamilnadu";
export type Topic  = "all" | "labour" | "farmers" | "dalit" | "corporate" | "state" | "elections";
export type Depth  = "brief" | "standard" | "deep";

export const REGION_OPTIONS = [
  { value: "both" as Region,      label: "India + Tamil Nadu" },
  { value: "india" as Region,     label: "India (National)"   },
  { value: "tamilnadu" as Region, label: "Tamil Nadu Only"    },
];

export const TOPIC_OPTIONS = [
  { value: "all" as Topic,       label: "All Political Topics"     },
  { value: "labour" as Topic,    label: "Labour & Workers"         },
  { value: "farmers" as Topic,   label: "Farmers & Land Rights"    },
  { value: "dalit" as Topic,     label: "Dalit & Caste Oppression" },
  { value: "corporate" as Topic, label: "Corporate & Capitalism"   },
  { value: "state" as Topic,     label: "State & Police Violence"  },
  { value: "elections" as Topic, label: "Elections & Parties"      },
];

export const WORLD_TOPIC_OPTIONS = [
  { value: "all" as Topic,       label: "All World Topics"            },
  { value: "labour" as Topic,    label: "Labour & Workers"            },
  { value: "farmers" as Topic,   label: "Farmers & Land Rights"       },
  { value: "corporate" as Topic, label: "Imperialism & Capital"       },
  { value: "state" as Topic,     label: "Wars & State Violence"       },
  { value: "elections" as Topic, label: "Elections & Political Shifts" },
];

export const DEPTH_OPTIONS = [
  { value: "brief" as Depth,    label: "Brief Scan"    },
  { value: "standard" as Depth, label: "Standard"      },
  { value: "deep" as Depth,     label: "Deep Analysis" },
];

export const WORLD_REGIONS = [
  "USA","Europe","Russia","China","Palestine","Iran",
  "Ukraine","Brazil","Cuba","Venezuela","Africa",
  "Myanmar","Pakistan","Bangladesh","Sri Lanka",
];
