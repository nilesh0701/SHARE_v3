"""One-time schema setup: creates all tables defined in app.models.tables."""

import app.models.tables  # noqa: F401 — register table definitions on metadata
from app.db import engine, metadata


def main() -> None:
    metadata.create_all(engine)
    print("Database schema created.")


if __name__ == "__main__":
    main()
