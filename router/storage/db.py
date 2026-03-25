from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import inspect, text

from router.core.config import settings
from router.services.logs import apply_log_retention

engine = create_engine(settings.database_url, echo=False)

def _ensure_rule_template_id_column() -> None:
    inspector = inspect(engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("rule")}
    except Exception:
        return
    if "template_id" in columns:
        return
    ddl = "ALTER TABLE rule ADD COLUMN template_id TEXT"
    with engine.connect() as conn:
        conn.execute(text(ddl))
        conn.commit()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_rule_template_id_column()
    with Session(engine) as session:
        apply_log_retention(session)


def get_session():
    with Session(engine) as session:
        yield session
