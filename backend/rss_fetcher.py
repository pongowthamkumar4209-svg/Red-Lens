"""
rss_fetcher.py — fetches real today's news from RSS feeds.
Reuters feeds replaced (dead). Peoples Dispatch + Morning Star replaced.
"""
import feedparser
import requests
import re
import logging
from datetime import date, datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

# ── India / Tamil Nadu feeds ──────────────────────────────────────────────────
INDIA_FEEDS = [
    {"url": "https://www.thehindu.com/news/national/feeder/default.rss",         "source": "The Hindu",         "region": "India"},
    {"url": "https://www.thehindu.com/business/feeder/default.rss",              "source": "The Hindu",         "region": "India"},
    {"url": "https://www.thehindu.com/opinion/feeder/default.rss",               "source": "The Hindu",         "region": "India"},
    {"url": "https://indianexpress.com/section/india/feed/",                     "source": "Indian Express",    "region": "India"},
    {"url": "https://indianexpress.com/section/politics/feed/",                  "source": "Indian Express",    "region": "India"},
    {"url": "https://thewire.in/rss/politics",                                   "source": "The Wire",          "region": "India"},
    {"url": "https://thewire.in/rss/economy",                                    "source": "The Wire",          "region": "India"},
    {"url": "https://scroll.in/feed",                                            "source": "Scroll.in",         "region": "India"},
    {"url": "https://www.ndtv.com/rss/feed?id=1",                               "source": "NDTV",              "region": "India"},
    {"url": "https://www.ndtv.com/rss/feed?id=3",                               "source": "NDTV Politics",     "region": "India"},
    # Tamil Nadu
    {"url": "https://www.thehindu.com/news/cities/chennai/feeder/default.rss",   "source": "The Hindu Chennai", "region": "Tamil Nadu"},
    {"url": "https://www.thehindu.com/news/states/tamil-nadu/feeder/default.rss","source": "The Hindu TN",      "region": "Tamil Nadu"},
    {"url": "https://indianexpress.com/section/cities/chennai/feed/",            "source": "Indian Express TN", "region": "Tamil Nadu"},
]

# ── World feeds ───────────────────────────────────────────────────────────────
WORLD_FEEDS = [
    {"url": "https://feeds.bbci.co.uk/news/world/rss.xml",                       "source": "BBC World"},
    {"url": "https://www.aljazeera.com/xml/rss/all.xml",                         "source": "Al Jazeera"},
    {"url": "https://rss.dw.com/rdf/rss-en-world",                              "source": "DW News"},
    {"url": "https://www.theguardian.com/world/rss",                             "source": "The Guardian"},
    {"url": "https://www.theguardian.com/business/rss",                          "source": "The Guardian Business"},
    {"url": "https://jacobin.com/feed/",                                         "source": "Jacobin"},
    # India foreign / bilateral / MoU
    {"url": "https://www.thehindu.com/news/international/feeder/default.rss",    "source": "The Hindu World"},
    {"url": "https://indianexpress.com/section/world/feed/",                     "source": "Indian Express World"},
    {"url": "https://thewire.in/rss/diplomacy",                                  "source": "The Wire Diplomacy"},
    # Extra world sources
    {"url": "https://www.aljazeera.com/xml/rss/all.xml",                         "source": "Al Jazeera"},
    {"url": "https://feeds.bbci.co.uk/news/business/rss.xml",                   "source": "BBC Business"},
    {"url": "https://rss.dw.com/rdf/rss-en-middle-east",                        "source": "DW Middle East"},
    {"url": "https://rss.dw.com/rdf/rss-en-asia",                               "source": "DW Asia"},
]

_STRIP_HTML = re.compile(r"<[^>]+>")
_MULTI_SPACE = re.compile(r"\s+")


def _clean(text: str) -> str:
    text = _STRIP_HTML.sub(" ", text)
    return _MULTI_SPACE.sub(" ", text).strip()


def _parse_date(entry) -> datetime | None:
    for field in ("published", "updated"):
        val = entry.get(field)
        if val:
            try:
                return parsedate_to_datetime(val)
            except Exception:
                pass
    for field in ("published_parsed", "updated_parsed"):
        val = entry.get(field)
        if val:
            try:
                return datetime(*val[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None


def _is_today(dt: datetime | None) -> bool:
    """Accept articles from today OR yesterday evening (IST) to handle timezone drift."""
    if dt is None:
        return True
    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(ist).date()
    yesterday = today - timedelta(days=1)
    try:
        local_date = dt.astimezone(ist).date()
        return local_date >= yesterday
    except Exception:
        return True


def _fetch_one(feed_info: dict, max_items: int = 20) -> list[dict]:
    items = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 RedLens/2.0 RSS Reader"}
        resp = requests.get(feed_info["url"], headers=headers, timeout=15)
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)

        for entry in parsed.entries[:max_items]:
            dt = _parse_date(entry)
            if not _is_today(dt):
                continue

            headline = _clean(entry.get("title", ""))
            summary  = _clean(entry.get("summary", entry.get("description", "")))[:500]

            if not headline or len(headline) < 12:
                continue

            items.append({
                "headline":   headline,
                "summary":    summary,
                "source":     feed_info["source"],
                "source_url": entry.get("link", ""),
                "region":     feed_info.get("region", ""),
                "pub_date":   dt.strftime("%d %b %Y") if dt else "Today",
            })

    except Exception as e:
        logger.warning(f"Feed {feed_info.get('source','?')} failed: {e}")

    return items


def _deduplicate(items: list[dict]) -> list[dict]:
    seen, unique = set(), []
    for item in items:
        key = item["headline"][:55].lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def fetch_india_rss(region_filter: str = "both") -> list[dict]:
    all_items = []
    for feed in INDIA_FEEDS:
        if region_filter == "india" and feed["region"] == "Tamil Nadu":
            continue
        if region_filter == "tamilnadu" and feed["region"] == "India":
            continue
        items = _fetch_one(feed)
        all_items.extend(items)
        logger.info(f"India RSS {feed['source']}: {len(items)} articles")

    unique = _deduplicate(all_items)
    logger.info(f"India RSS total unique: {len(unique)}")
    return unique


def fetch_world_rss() -> list[dict]:
    all_items = []
    for feed in WORLD_FEEDS:
        items = _fetch_one(feed)
        all_items.extend(items)
        logger.info(f"World RSS {feed['source']}: {len(items)} articles")

    unique = _deduplicate(all_items)
    logger.info(f"World RSS total unique: {len(unique)}")
    return unique


# ── Other News feeds (Sports, Cinema, Economics, Tech, Science, Health) ───────
OTHER_FEEDS_INDIA = [
    # Sports
    {"url": "https://www.thehindu.com/sport/feeder/default.rss",                  "source": "The Hindu",         "category": "SPORTS"},
    {"url": "https://indianexpress.com/section/sports/feed/",                     "source": "Indian Express",    "category": "SPORTS"},
    {"url": "https://www.ndtv.com/rss/feed?id=4",                                "source": "NDTV Sports",       "category": "SPORTS"},
    # Cinema / Entertainment
    {"url": "https://www.thehindu.com/entertainment/feeder/default.rss",          "source": "The Hindu",         "category": "CINEMA"},
    {"url": "https://indianexpress.com/section/entertainment/feed/",              "source": "Indian Express",    "category": "CINEMA"},
    # Economics / Business
    {"url": "https://www.thehindu.com/business/Economy/feeder/default.rss",       "source": "The Hindu",         "category": "ECONOMY"},
    {"url": "https://indianexpress.com/section/business/feed/",                   "source": "Indian Express",    "category": "ECONOMY"},
    {"url": "https://thewire.in/rss/economy",                                     "source": "The Wire",          "category": "ECONOMY"},
    # Technology
    {"url": "https://www.thehindu.com/sci-tech/technology/feeder/default.rss",    "source": "The Hindu",         "category": "TECHNOLOGY"},
    {"url": "https://indianexpress.com/section/technology/feed/",                 "source": "Indian Express",    "category": "TECHNOLOGY"},
    # Science
    {"url": "https://www.thehindu.com/sci-tech/science/feeder/default.rss",       "source": "The Hindu",         "category": "SCIENCE"},
    # Health
    {"url": "https://www.thehindu.com/sci-tech/health/feeder/default.rss",        "source": "The Hindu",         "category": "HEALTH"},
    {"url": "https://indianexpress.com/section/lifestyle/health/feed/",           "source": "Indian Express",    "category": "HEALTH"},
    # Education
    {"url": "https://indianexpress.com/section/education/feed/",                  "source": "Indian Express",    "category": "EDUCATION"},
    # Environment
    {"url": "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss", "source": "The Hindu", "category": "ENVIRONMENT"},
]

OTHER_FEEDS_WORLD = [
    # Sports
    {"url": "https://feeds.bbci.co.uk/sport/rss.xml",                            "source": "BBC Sport",         "category": "SPORTS"},
    {"url": "https://rss.dw.com/rdf/rss-en-sports",                              "source": "DW Sport",          "category": "SPORTS"},
    # Cinema / Arts
    {"url": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",      "source": "BBC Entertainment", "category": "CINEMA"},
    {"url": "https://www.theguardian.com/film/rss",                               "source": "The Guardian Film", "category": "CINEMA"},
    # Economics
    {"url": "https://feeds.bbci.co.uk/news/business/rss.xml",                    "source": "BBC Business",      "category": "ECONOMY"},
    {"url": "https://www.theguardian.com/business/economics/rss",                 "source": "The Guardian",      "category": "ECONOMY"},
    {"url": "https://rss.dw.com/rdf/rss-en-business",                            "source": "DW Business",       "category": "ECONOMY"},
    # Technology
    {"url": "https://feeds.bbci.co.uk/news/technology/rss.xml",                  "source": "BBC Tech",          "category": "TECHNOLOGY"},
    {"url": "https://www.theguardian.com/technology/rss",                         "source": "The Guardian Tech", "category": "TECHNOLOGY"},
    # Science
    {"url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",     "source": "BBC Science",       "category": "SCIENCE"},
    {"url": "https://www.theguardian.com/science/rss",                            "source": "The Guardian",      "category": "SCIENCE"},
    # Health
    {"url": "https://feeds.bbci.co.uk/news/health/rss.xml",                      "source": "BBC Health",        "category": "HEALTH"},
    {"url": "https://www.theguardian.com/society/health/rss",                     "source": "The Guardian",      "category": "HEALTH"},
    # Environment
    {"url": "https://www.theguardian.com/environment/rss",                        "source": "The Guardian",      "category": "ENVIRONMENT"},
]


def fetch_other_rss(scope: str = "india", category: str = "all") -> list[dict]:
    """Fetch Other News feeds (sports, cinema, economy, tech, science, health, environment)."""
    feeds = OTHER_FEEDS_INDIA if scope == "india" else OTHER_FEEDS_WORLD
    all_items = []
    for feed in feeds:
        if category != "all" and feed["category"] != category.upper():
            continue
        items = _fetch_one(feed)
        # Tag each item with its category
        for item in items:
            item["category"] = feed["category"]
        all_items.extend(items)
        logger.info(f"Other RSS [{feed['category']}] {feed['source']}: {len(items)} articles")

    unique = _deduplicate(all_items)
    logger.info(f"Other RSS total unique ({scope}/{category}): {len(unique)}")
    return unique
