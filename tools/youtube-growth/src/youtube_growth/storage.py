from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def save_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


@contextmanager
def exclusive_run(directory: Path):
    """A stale lock is deliberately not removed automatically after a crash."""
    directory.mkdir(parents=True, exist_ok=True)
    lock = directory / "run.lock"
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as error:
        raise RuntimeError(f"Traitement déjà actif ou interrompu. Vérifiez {lock} avant de retirer ce verrou.") from error
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(str(os.getpid()))
        yield
    finally:
        lock.unlink()


class Journal:
    """Write intent before network effects; never replay an ambiguous write."""

    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path, timeout=30)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, result TEXT, updated_at TEXT NOT NULL)")
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def begin(self, kind: str, payload: dict) -> tuple[str, bool]:
        operation_id = digest({"kind": kind, "payload": payload})
        with self.connection:
            cursor = self.connection.execute(
                "INSERT OR IGNORE INTO operations VALUES (?, ?, ?, 'started', NULL, ?)",
                (operation_id, kind, json.dumps(payload, ensure_ascii=False), now_iso()),
            )
        if cursor.rowcount == 1:
            return operation_id, True
        row = self.connection.execute("SELECT status FROM operations WHERE id = ?", (operation_id,)).fetchone()
        if row["status"] != "complete":
            raise RuntimeError(f"Opération {operation_id[:12]} incertaine. Vérifier YouTube avant toute reprise.")
        return operation_id, False

    def finish(self, operation_id: str, result: dict) -> None:
        with self.connection:
            self.connection.execute("UPDATE operations SET status='complete', result=?, updated_at=? WHERE id=?", (json.dumps(result, ensure_ascii=False), now_iso(), operation_id))

    def entries(self) -> list[dict]:
        return [dict(row) for row in self.connection.execute("SELECT id,kind,status,updated_at FROM operations ORDER BY updated_at DESC")]
