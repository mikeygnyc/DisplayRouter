import warnings
import pytest
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

import router.domain.models  # noqa: F401 — ensures all models are registered
import router.storage.db as db_module
import router.main as main_module
from router.main import app


@pytest.fixture(autouse=True)
def use_in_memory_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    def get_session_override():
        with Session(engine) as session:
            yield session

    def init_db_override():
        SQLModel.metadata.create_all(engine)

    app.dependency_overrides[db_module.get_session] = get_session_override

    with patch.object(main_module, "init_db", init_db_override), \
         warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=pytest.PytestUnraisableExceptionWarning)
        yield

    app.dependency_overrides.pop(db_module.get_session, None)
    engine.dispose()
