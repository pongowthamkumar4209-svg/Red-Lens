from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()


class NewsSession(db.Model):
    __tablename__ = "news_sessions"

    id         = db.Column(db.Integer, primary_key=True)
    date       = db.Column(db.String(10), nullable=False, index=True)   # YYYY-MM-DD
    section    = db.Column(db.String(20), nullable=False, default="india", index=True)
    region     = db.Column(db.String(50), nullable=False)
    topic      = db.Column(db.String(50), nullable=False)
    depth      = db.Column(db.String(20), nullable=False, default="standard")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    articles   = db.relationship(
        "NewsArticle", backref="session",
        cascade="all, delete-orphan", lazy=True
    )

    def to_dict(self, include_articles=False):
        data = {
            "id":            self.id,
            "date":          self.date,
            "section":       self.section,
            "region":        self.region,
            "topic":         self.topic,
            "depth":         self.depth,
            "created_at":    self.created_at.isoformat(),
            "article_count": len(self.articles),
        }
        if include_articles:
            data["articles"] = [a.to_dict() for a in self.articles]
        return data


class NewsArticle(db.Model):
    __tablename__ = "news_articles"

    id            = db.Column(db.Integer, primary_key=True)
    session_id    = db.Column(db.Integer, db.ForeignKey("news_sessions.id"), nullable=False, index=True)
    section       = db.Column(db.String(20), default="india", index=True)
    region        = db.Column(db.String(100))
    country       = db.Column(db.String(100))
    tag           = db.Column(db.String(80))
    headline      = db.Column(db.Text, nullable=False)
    summary       = db.Column(db.Text)
    red_lens      = db.Column(db.Text)
    source        = db.Column(db.String(160))
    source_url    = db.Column(db.Text)          # original article URL
    article_time  = db.Column(db.String(60))
    is_bookmarked = db.Column(db.Boolean, default=False, index=True)
    date          = db.Column(db.String(10), index=True)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id":            self.id,
            "session_id":    self.session_id,
            "section":       self.section,
            "region":        self.region,
            "country":       self.country,
            "tag":           self.tag,
            "headline":      self.headline,
            "summary":       self.summary,
            "red_lens":      self.red_lens,
            "source":        self.source,
            "source_url":    self.source_url,
            "article_time":  self.article_time,
            "is_bookmarked": self.is_bookmarked,
            "date":          self.date,
            "created_at":    self.created_at.isoformat(),
        }
