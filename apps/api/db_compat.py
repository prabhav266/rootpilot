from sqlalchemy import inspect, text


def _add_column(connection, table_name, column_name, definition):
    connection.execute(
        text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")
    )


def ensure_repository_schema(engine):
    inspector = inspect(engine)
    if not inspector.has_table("repositories"):
        return

    columns = {column["name"] for column in inspector.get_columns("repositories")}

    with engine.begin() as connection:
        dialect = engine.dialect.name

        if "owner_github_id" not in columns:
            nullable = "" if dialect == "sqlite" else " NOT NULL DEFAULT 'legacy'"
            _add_column(connection, "repositories", "owner_github_id", f"VARCHAR{nullable}")

        if "owner_login" not in columns:
            _add_column(connection, "repositories", "owner_login", "VARCHAR")

        if dialect == "postgresql":
            connection.execute(
                text(
                    "ALTER TABLE repositories "
                    "DROP CONSTRAINT IF EXISTS repositories_github_repo_id_key"
                )
            )
            connection.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1
                            FROM pg_constraint
                            WHERE conname = 'uq_owner_github_repo'
                        ) THEN
                            ALTER TABLE repositories
                            ADD CONSTRAINT uq_owner_github_repo
                            UNIQUE (owner_github_id, github_repo_id);
                        END IF;
                    END $$;
                    """
                )
            )


def ensure_event_schema(engine):
    inspector = inspect(engine)
    if not inspector.has_table("events"):
        return

    columns = {column["name"] for column in inspector.get_columns("events")}

    with engine.begin() as connection:
        if "owner_github_id" not in columns:
            _add_column(connection, "events", "owner_github_id", "VARCHAR")

        if "repository_github_id" not in columns:
            _add_column(connection, "events", "repository_github_id", "VARCHAR")


def ensure_schema(engine):
    ensure_repository_schema(engine)
    ensure_event_schema(engine)
