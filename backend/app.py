import os
import logging
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from models import db
from routes.news import news_bp
from scheduler import init_scheduler

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)

    DATABASE_URL = os.environ.get("DATABASE_URL", "")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL or "sqlite:///red_lens_dev.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True, "pool_recycle": 300}

    allowed_origins = os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")

    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    db.init_app(app)
    app.register_blueprint(news_bp)

    with app.app_context():
        db.create_all()
        logger.info("Database tables ensured.")

    # Start scheduler (not in reloader child process)
    if os.environ.get("WERKZEUG_RUN_MAIN") != "false":
        if os.environ.get("DISABLE_SCHEDULER", "false").lower() != "true":
            init_scheduler(app)

    return app


app = create_app()

if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
