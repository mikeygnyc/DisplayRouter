from sqlmodel import SQLModel, Session, create_engine

from router.core.config import settings
from router.services.logs import apply_log_retention

engine = create_engine(settings.database_url, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        apply_log_retention(session)


def get_session():
    with Session(engine) as session:
        yield session
