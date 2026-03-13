from flask import Blueprint, request, jsonify, Response, stream_with_context
from datetime import date, datetime, timezone, timedelta
from models import db, NewsSession, NewsArticle
from rss_fetcher import fetch_india_rss, fetch_world_rss
from claude_client import analyse_india_articles, analyse_world_articles
import json
import logging

logger = logging.getLogger(__name__)
news_bp = Blueprint("news", __name__)

TOPIC_KEYWORDS = {
    "labour":    ["labour","labor","worker","strike","union","wage","employment","job","salary","mnrega","gig"],
    "farmers":   ["farmer","agriculture","crop","farm","msp","agrarian","kisan","irrigation","rural","paddy"],
    "dalit":     ["dalit","caste","sc/st","scheduled","atrocity","discrimination","ambedkar","reservation"],
    "corporate": ["corporate","company","profit","adani","ambani","tata","reliance","ipo","market","tax","billionaire"],
    "state":     ["police","arrest","custody","encounter","violence","crackdown","protest","detain","uapa","sedition","nia"],
    "elections": ["election","vote","party","bjp","congress","dmk","aiadmk","poll","campaign","seat","coalition"],
}


def _save_session(section, region, topic, depth, today_str, articles):
    session = NewsSession(date=today_str, section=section, region=region, topic=topic, depth=depth)
    db.session.add(session)
    db.session.flush()
    for a in articles:
        db.session.add(NewsArticle(
            session_id   = session.id,
            section      = section,
            region       = a.get("region", region),
            country      = a.get("country", ""),
            tag          = a.get("tag", "POLITICS"),
            headline     = a.get("headline", ""),
            summary      = a.get("summary", ""),
            red_lens     = a.get("red_lens", ""),
            source       = a.get("source", ""),
            source_url   = a.get("source_url", ""),
            article_time = a.get("article_time", ""),
            date         = today_str,
        ))
    db.session.commit()
    return session


def _purge_old():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
    old = NewsSession.query.filter(NewsSession.date < cutoff).all()
    if old:
        for s in old:
            db.session.delete(s)
        db.session.commit()
        logger.info(f"Purged {len(old)} sessions older than 7 days.")


def _filter_by_topic(raw: list, topic: str) -> list:
    if topic == "all" or topic not in TOPIC_KEYWORDS:
        return raw
    kws = TOPIC_KEYWORDS[topic]
    filtered = [a for a in raw if any(k in (a["headline"] + " " + a["summary"]).lower() for k in kws)]
    return filtered if len(filtered) >= 5 else raw  # fallback if too few matches


# ── India / TN ────────────────────────────────────────────────────────────────
@news_bp.route("/api/fetch-news", methods=["POST"])
def fetch_news():
    body          = request.get_json(silent=True) or {}
    region        = body.get("region", "both")
    topic         = body.get("topic", "all")
    depth         = body.get("depth", "standard")
    force_refresh = body.get("force_refresh", False)
    today_str     = date.today().isoformat()

    # Return cache if available
    if not force_refresh:
        existing = (
            NewsSession.query
            .filter_by(date=today_str, section="india", region=region, topic=topic)
            .order_by(NewsSession.created_at.desc()).first()
        )
        if existing:
            return jsonify({"session": existing.to_dict(include_articles=True), "from_cache": True}), 200

    # Fetch RSS
    try:
        raw = fetch_india_rss(region)
    except Exception as e:
        return jsonify({"error": f"RSS fetch failed: {e}"}), 500

    if not raw:
        return jsonify({"error": "No articles found in RSS feeds today. Try again in a few minutes."}), 404

    raw = _filter_by_topic(raw, topic)
    logger.info(f"India: {len(raw)} articles to analyse (region={region}, topic={topic})")

    # Analyse with Claude
    try:
        analysed = analyse_india_articles(raw, depth, today_str)
    except Exception as e:
        return jsonify({"error": f"Claude analysis failed: {e}"}), 500

    session = _save_session("india", region, topic, depth, today_str, analysed)
    _purge_old()

    return jsonify({"session": session.to_dict(include_articles=True), "from_cache": False}), 201


# ── World ─────────────────────────────────────────────────────────────────────
@news_bp.route("/api/fetch-world-news", methods=["POST"])
def fetch_world_news():
    body          = request.get_json(silent=True) or {}
    topic         = body.get("topic", "all")
    depth         = body.get("depth", "standard")
    force_refresh = body.get("force_refresh", False)
    today_str     = date.today().isoformat()

    if not force_refresh:
        existing = (
            NewsSession.query
            .filter_by(date=today_str, section="world", region="world", topic=topic)
            .order_by(NewsSession.created_at.desc()).first()
        )
        if existing:
            return jsonify({"session": existing.to_dict(include_articles=True), "from_cache": True}), 200

    try:
        raw = fetch_world_rss()
    except Exception as e:
        return jsonify({"error": f"RSS fetch failed: {e}"}), 500

    if not raw:
        return jsonify({"error": "No world articles found today. Try again in a few minutes."}), 404

    logger.info(f"World: {len(raw)} articles to analyse")

    try:
        analysed = analyse_world_articles(raw, depth, today_str)
    except Exception as e:
        return jsonify({"error": f"Claude analysis failed: {e}"}), 500

    session = _save_session("world", "world", topic, depth, today_str, analysed)
    _purge_old()

    return jsonify({"session": session.to_dict(include_articles=True), "from_cache": False}), 201


# ── Sessions ──────────────────────────────────────────────────────────────────
@news_bp.route("/api/sessions", methods=["GET"])
def list_sessions():
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)
    section  = request.args.get("section")
    q = NewsSession.query
    if section: q = q.filter_by(section=section)
    p = q.order_by(NewsSession.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"sessions": [s.to_dict() for s in p.items], "total": p.total, "page": page, "pages": p.pages}), 200


@news_bp.route("/api/sessions/<int:sid>", methods=["GET"])
def get_session(sid):
    return jsonify(db.get_or_404(NewsSession, sid).to_dict(include_articles=True)), 200


@news_bp.route("/api/sessions/<int:sid>", methods=["DELETE"])
def delete_session(sid):
    s = db.get_or_404(NewsSession, sid)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"deleted": True, "id": sid}), 200


@news_bp.route("/api/sessions/date/<string:date_str>", methods=["GET"])
def sessions_by_date(date_str):
    section = request.args.get("section")
    q = NewsSession.query.filter_by(date=date_str)
    if section: q = q.filter_by(section=section)
    return jsonify([s.to_dict(include_articles=True) for s in q.order_by(NewsSession.created_at.desc()).all()]), 200


@news_bp.route("/api/sessions/dates", methods=["GET"])
def available_dates():
    section = request.args.get("section")
    stmt = db.select(NewsSession.date).distinct().order_by(NewsSession.date.desc())
    if section:
        stmt = stmt.where(NewsSession.section == section)
    return jsonify({"dates": db.session.execute(stmt).scalars().all()}), 200


# ── Articles ──────────────────────────────────────────────────────────────────
@news_bp.route("/api/articles/<int:aid>/bookmark", methods=["PATCH"])
def toggle_bookmark(aid):
    a = db.get_or_404(NewsArticle, aid)
    a.is_bookmarked = not a.is_bookmarked
    db.session.commit()
    return jsonify({"id": aid, "is_bookmarked": a.is_bookmarked}), 200


@news_bp.route("/api/articles/bookmarks", methods=["GET"])
def get_bookmarks():
    section = request.args.get("section")
    q = NewsArticle.query.filter_by(is_bookmarked=True)
    if section: q = q.filter_by(section=section)
    return jsonify([a.to_dict() for a in q.order_by(NewsArticle.created_at.desc()).all()]), 200


@news_bp.route("/api/articles/search", methods=["GET"])
def search_articles():
    q_str    = request.args.get("q","").strip()
    tag      = request.args.get("tag","")
    section  = request.args.get("section","")
    country  = request.args.get("country","")
    page     = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)

    if not any([q_str, tag, section, country]):
        return jsonify({"error": "Provide at least one search parameter"}), 400

    q = NewsArticle.query
    if q_str:
        like = f"%{q_str}%"
        q = q.filter(db.or_(
            NewsArticle.headline.ilike(like),
            NewsArticle.summary.ilike(like),
            NewsArticle.red_lens.ilike(like),
            NewsArticle.country.ilike(like),
        ))
    if tag:     q = q.filter(NewsArticle.tag.ilike(f"%{tag}%"))
    if section: q = q.filter(NewsArticle.section == section)
    if country: q = q.filter(NewsArticle.country.ilike(f"%{country}%"))

    p = q.order_by(NewsArticle.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({"articles": [a.to_dict() for a in p.items], "total": p.total, "page": page, "pages": p.pages}), 200


@news_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()}), 200


# ── Other News (Sports / Cinema / Economy / Tech / Science / Health / Env) ───
@news_bp.route("/api/fetch-other-news", methods=["POST"])
def fetch_other_news():
    body          = request.get_json(silent=True) or {}
    scope         = body.get("scope", "india")          # "india" | "world"
    category      = body.get("category", "all")         # "all" | "SPORTS" | "CINEMA" etc.
    depth         = body.get("depth", "brief")
    force_refresh = body.get("force_refresh", False)
    today_str     = date.today().isoformat()

    region_key = f"other-{scope}-{category}"

    if not force_refresh:
        existing = (
            NewsSession.query
            .filter_by(date=today_str, section="other", region=region_key, topic=category)
            .order_by(NewsSession.created_at.desc()).first()
        )
        if existing:
            return jsonify({"session": existing.to_dict(include_articles=True), "from_cache": True}), 200

    from rss_fetcher import fetch_other_rss
    from claude_client import analyse_other_articles

    try:
        raw = fetch_other_rss(scope=scope, category=category)
    except Exception as e:
        return jsonify({"error": f"RSS fetch failed: {e}"}), 500

    if not raw:
        return jsonify({"error": "No articles found for this category today."}), 404

    logger.info(f"Other news: {len(raw)} articles (scope={scope}, category={category})")

    try:
        analysed = analyse_other_articles(raw, depth, today_str, scope)
    except Exception as e:
        return jsonify({"error": f"Claude analysis failed: {e}"}), 500

    session = _save_session("other", region_key, category, depth, today_str, analysed)
    _purge_old()

    return jsonify({"session": session.to_dict(include_articles=True), "from_cache": False}), 201
