"""
claude_client.py
Sends real RSS articles to Claude in small batches for Red Lens analysis.
Batch size = 10 to avoid timeouts. Runs multiple quick API calls.
"""
import os
import json
import logging
import anthropic

logger = logging.getLogger(__name__)
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

DEPTH_INSTRUCTIONS = {
    "brief":    "1 sharp sentence of class analysis.",
    "standard": "2-3 sentences: class forces, state/capital role, worker/peasant perspective.",
    "deep":     "4-5 sentences: class forces, state/capital role, caste-class intersections, historical context, what workers should understand.",
}

INDIA_TAGS = (
    "LABOUR | FARMERS | DALIT | ELECTIONS | CORPORATE | STATE VIOLENCE | "
    "HOUSING | EDUCATION | ENVIRONMENT | HEALTH | GENDER | MINORITIES | "
    "ADIVASI | PRIVATISATION | COMMUNALISM | MEDIA | ECONOMY | POLITICS"
)

WORLD_TAGS = (
    "WAR & CONFLICT | IMPERIALISM | LABOUR | SANCTIONS | MOU | DIPLOMACY | "
    "CLIMATE | CORPORATE | ELECTIONS | STATE VIOLENCE | SOLIDARITY | "
    "COUP | PROTEST | ECONOMIC POLICY | REFUGEES | NUCLEAR | TRADE | "
    "INDIA-BILATERAL | MEDIA | ENVIRONMENT | HEALTH"
)

# Small batch = faster, no timeouts
BATCH_SIZE = 8


def _call_claude(prompt: str) -> list:
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",  # Haiku = fast + cheap for batch analysis
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    if "```" in raw:
        for part in raw.split("```"):
            s = part.strip().lstrip("json").strip()
            if s.startswith("["):
                raw = s
                break
    raw = raw.strip()
    # Find JSON array even if there's surrounding text
    start = raw.find("[")
    end   = raw.rfind("]") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
    return json.loads(raw)


def _analyse_batch(batch: list[dict], is_world: bool, depth_instr: str, today: str) -> list[dict]:
    """Analyse one small batch of articles."""
    tags   = WORLD_TAGS if is_world else INDIA_TAGS
    context = "international affairs from a Marxist/anti-imperialist perspective" if is_world else "India/Tamil Nadu politics from a communist perspective"

    articles_text = "\n".join(
        f'{i+1}. [{a["source"]}] {a["headline"]}\n   {a["summary"][:200]}'
        for i, a in enumerate(batch)
    )

    if is_world:
        extra = (
            "If article involves India signing MoUs, treaties, or bilateral agreements — tag it MOU or INDIA-BILATERAL.\n"
            "Identify the country/region each article is about."
        )
        obj_fields = '"index":N, "country":"Country name", "tag":"TAG", "red_lens":"analysis"'
    else:
        extra = "Identify if each article is about India (national) or Tamil Nadu."
        obj_fields = '"index":N, "region":"India or Tamil Nadu", "tag":"TAG", "red_lens":"analysis"'

    prompt = f"""Analyse these {len(batch)} real news articles on {context}.
Today: {today}

{extra}

Analysis per article: {depth_instr}
- Name class forces explicitly
- Identify state/corporate role
- Centre workers, peasants, Dalits, minorities
- Use Marxist vocabulary naturally

VALID TAGS: {tags}

ARTICLES:
{articles_text}

Respond ONLY with a JSON array, exactly {len(batch)} objects, same order as input:
[{{{obj_fields}}}, ...]"""

    return _call_claude(prompt)


def analyse_india_articles(raw_articles: list, depth: str, today: str) -> list:
    if not raw_articles:
        return []

    depth_instr = DEPTH_INSTRUCTIONS.get(depth, DEPTH_INSTRUCTIONS["standard"])
    results = []

    for i in range(0, len(raw_articles), BATCH_SIZE):
        batch = raw_articles[i:i + BATCH_SIZE]
        logger.info(f"Analysing India batch {i//BATCH_SIZE + 1} ({len(batch)} articles)...")
        try:
            analysed = _analyse_batch(batch, is_world=False, depth_instr=depth_instr, today=today)
            for item in analysed:
                idx = int(item.get("index", 0)) - 1
                if 0 <= idx < len(batch):
                    raw = batch[idx]
                    results.append({
                        "section":      "india",
                        "region":       item.get("region", raw.get("region", "India")),
                        "country":      "India",
                        "tag":          str(item.get("tag", "POLITICS")).upper(),
                        "headline":     raw["headline"],
                        "summary":      raw["summary"],
                        "red_lens":     item.get("red_lens", ""),
                        "source":       raw["source"],
                        "source_url":   raw.get("source_url", ""),
                        "article_time": raw.get("pub_date", "Today"),
                    })
        except Exception as e:
            logger.error(f"India batch {i//BATCH_SIZE + 1} failed: {e}")
            # Include articles without analysis rather than losing them
            for raw in batch:
                results.append({
                    "section":      "india",
                    "region":       raw.get("region", "India"),
                    "country":      "India",
                    "tag":          "POLITICS",
                    "headline":     raw["headline"],
                    "summary":      raw["summary"],
                    "red_lens":     "Red Lens analysis pending.",
                    "source":       raw["source"],
                    "source_url":   raw.get("source_url", ""),
                    "article_time": raw.get("pub_date", "Today"),
                })

    logger.info(f"India analysis complete: {len(results)} articles")
    return results


def analyse_world_articles(raw_articles: list, depth: str, today: str) -> list:
    if not raw_articles:
        return []

    depth_instr = DEPTH_INSTRUCTIONS.get(depth, DEPTH_INSTRUCTIONS["standard"])
    results = []

    for i in range(0, len(raw_articles), BATCH_SIZE):
        batch = raw_articles[i:i + BATCH_SIZE]
        logger.info(f"Analysing World batch {i//BATCH_SIZE + 1} ({len(batch)} articles)...")
        try:
            analysed = _analyse_batch(batch, is_world=True, depth_instr=depth_instr, today=today)
            for item in analysed:
                idx = int(item.get("index", 0)) - 1
                if 0 <= idx < len(batch):
                    raw = batch[idx]
                    country = item.get("country", "World")
                    results.append({
                        "section":      "world",
                        "region":       country,
                        "country":      country,
                        "tag":          str(item.get("tag", "WORLD")).upper(),
                        "headline":     raw["headline"],
                        "summary":      raw["summary"],
                        "red_lens":     item.get("red_lens", ""),
                        "source":       raw["source"],
                        "source_url":   raw.get("source_url", ""),
                        "article_time": raw.get("pub_date", "Today"),
                    })
        except Exception as e:
            logger.error(f"World batch {i//BATCH_SIZE + 1} failed: {e}")
            for raw in batch:
                results.append({
                    "section":      "world",
                    "region":       "World",
                    "country":      "World",
                    "tag":          "WORLD",
                    "headline":     raw["headline"],
                    "summary":      raw["summary"],
                    "red_lens":     "Red Lens analysis pending.",
                    "source":       raw["source"],
                    "source_url":   raw.get("source_url", ""),
                    "article_time": raw.get("pub_date", "Today"),
                })

    logger.info(f"World analysis complete: {len(results)} articles")
    return results


OTHER_TAGS = (
    "SPORTS | CRICKET | FOOTBALL | TENNIS | OLYMPICS | CINEMA | BOLLYWOOD | "
    "KOLLYWOOD | OTT | ECONOMY | MARKETS | STARTUP | BUDGET | TECHNOLOGY | "
    "AI | SCIENCE | HEALTH | ENVIRONMENT | EDUCATION | LIFESTYLE"
)

def analyse_other_articles(raw_articles: list, depth: str, today: str, scope: str = "india") -> list:
    """Analyse Other News articles (sports, cinema, economy, tech etc.) with brief context."""
    if not raw_articles:
        return []

    depth_instr = DEPTH_INSTRUCTIONS.get(depth, DEPTH_INSTRUCTIONS["standard"])
    scope_label = "India" if scope == "india" else "World"
    results = []

    for i in range(0, len(raw_articles), BATCH_SIZE):
        batch = raw_articles[i:i + BATCH_SIZE]
        logger.info(f"Analysing Other batch {i//BATCH_SIZE + 1} ({len(batch)} articles)...")

        articles_text = "\n".join(
            f'{j+1}. [{a.get("category","?")}] [{a["source"]}] {a["headline"]}\n   {a["summary"][:200]}'
            for j, a in enumerate(batch)
        )

        prompt = f"""You are Red Lens, a materialist analyst covering {scope_label} news across sports, cinema, economy, technology, science, health and environment.
Today: {today}

For each article, provide a brief materialist/class-conscious observation — not every article needs heavy Marxist framing, but note:
- Who benefits commercially or politically?
- Any corporate/state interest at play?
- Worker, fan, consumer, or public interest angle where relevant

Analysis requirement: {depth_instr}

VALID TAGS: {OTHER_TAGS}

ARTICLES:
{articles_text}

Respond ONLY with a JSON array, exactly {len(batch)} objects:
[{{"index":N, "tag":"TAG", "category":"ORIGINAL_CATEGORY", "red_lens":"brief materialist observation"}}, ...]"""

        try:
            analysed = _call_claude(prompt)
            for item in analysed:
                idx = int(item.get("index", 0)) - 1
                if 0 <= idx < len(batch):
                    raw = batch[idx]
                    results.append({
                        "section":      "other",
                        "region":       scope_label,
                        "country":      scope_label,
                        "tag":          str(item.get("tag", raw.get("category", "OTHER"))).upper(),
                        "category":     raw.get("category", "OTHER"),
                        "headline":     raw["headline"],
                        "summary":      raw["summary"],
                        "red_lens":     item.get("red_lens", ""),
                        "source":       raw["source"],
                        "source_url":   raw.get("source_url", ""),
                        "article_time": raw.get("pub_date", "Today"),
                    })
        except Exception as e:
            logger.error(f"Other batch {i//BATCH_SIZE + 1} failed: {e}")
            for raw in batch:
                results.append({
                    "section":      "other",
                    "region":       scope_label,
                    "country":      scope_label,
                    "tag":          raw.get("category", "OTHER"),
                    "category":     raw.get("category", "OTHER"),
                    "headline":     raw["headline"],
                    "summary":      raw["summary"],
                    "red_lens":     "Analysis pending.",
                    "source":       raw["source"],
                    "source_url":   raw.get("source_url", ""),
                    "article_time": raw.get("pub_date", "Today"),
                })

    logger.info(f"Other analysis complete: {len(results)} articles")
    return results
