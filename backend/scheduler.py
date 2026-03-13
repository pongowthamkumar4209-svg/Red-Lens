import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date, datetime, timezone, timedelta

logger = logging.getLogger(__name__)


def run_daily_fetch(app):
    with app.app_context():
        from models import db, NewsSession, NewsArticle
        from rss_fetcher import fetch_india_rss, fetch_world_rss
        from claude_client import analyse_india_articles, analyse_world_articles

        today_str = date.today().isoformat()
        logger.info(f"[Scheduler] Daily fetch for {today_str}")

        # ── Purge news older than 7 days ──────────────────────────────────
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
        old = NewsSession.query.filter(NewsSession.date < cutoff).all()
        for s in old:
            db.session.delete(s)
        db.session.commit()
        logger.info(f"[Scheduler] Purged {len(old)} old sessions before {cutoff}")

        # ── India + Tamil Nadu ────────────────────────────────────────────
        for region in ["both", "india", "tamilnadu"]:
            existing = NewsSession.query.filter_by(
                date=today_str, section="india", region=region, topic="all"
            ).first()
            if existing:
                logger.info(f"[Scheduler] India/{region} already fetched today, skip.")
                continue
            try:
                raw      = fetch_india_rss(region)
                analysed = analyse_india_articles(raw, "standard", today_str)
                session  = NewsSession(date=today_str, section="india", region=region, topic="all", depth="standard")
                db.session.add(session)
                db.session.flush()
                for a in analysed:
                    db.session.add(NewsArticle(
                        session_id=session.id, section="india",
                        region=a.get("region", region), country="India",
                        tag=a.get("tag","POLITICS"), headline=a.get("headline",""),
                        summary=a.get("summary",""), red_lens=a.get("red_lens",""),
                        source=a.get("source",""), source_url=a.get("source_url",""),
                        article_time=a.get("article_time",""), date=today_str,
                    ))
                db.session.commit()
                logger.info(f"[Scheduler] India/{region}: {len(analysed)} articles saved.")
            except Exception as e:
                db.session.rollback()
                logger.error(f"[Scheduler] India/{region} failed: {e}")

        # ── World ─────────────────────────────────────────────────────────
        existing = NewsSession.query.filter_by(
            date=today_str, section="world", region="world", topic="all"
        ).first()
        if not existing:
            try:
                raw      = fetch_world_rss()
                analysed = analyse_world_articles(raw, "standard", today_str)
                session  = NewsSession(date=today_str, section="world", region="world", topic="all", depth="standard")
                db.session.add(session)
                db.session.flush()
                for a in analysed:
                    db.session.add(NewsArticle(
                        session_id=session.id, section="world",
                        region=a.get("country","World"), country=a.get("country","World"),
                        tag=a.get("tag","WORLD"), headline=a.get("headline",""),
                        summary=a.get("summary",""), red_lens=a.get("red_lens",""),
                        source=a.get("source",""), source_url=a.get("source_url",""),
                        article_time=a.get("article_time",""), date=today_str,
                    ))
                db.session.commit()
                logger.info(f"[Scheduler] World: {len(analysed)} articles saved.")
            except Exception as e:
                db.session.rollback()
                logger.error(f"[Scheduler] World failed: {e}")
        else:
            logger.info("[Scheduler] World already fetched today, skip.")

        logger.info("[Scheduler] Daily fetch complete.")


def init_scheduler(app):
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        func=lambda: run_daily_fetch(app),
        trigger=CronTrigger(hour=7, minute=0, timezone="Asia/Kolkata"),
        id="daily_news_fetch",
        name="Daily Red Lens — RSS Fetch + Claude Analysis + 7-day purge",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("[Scheduler] APScheduler started — daily fetch at 07:00 IST")
    return scheduler
