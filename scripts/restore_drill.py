"""Rehearse a database restore for the SQLite database and prove the copy matches. Counts only, never content.

    python scripts/restore_drill.py [path-to-sqlite-file]      # default: data/mindbridge.sqlite3

Steps: take a consistent backup with SQLite's online backup API (safe while the app runs), restore it into a
separate temporary file, run `PRAGMA integrity_check` on the restored copy, and compare the row count of every
table with the source. Exit code 0 only if everything matches. The source is opened read-only and never changed;
the temporary files are deleted afterwards. The backup and the restore stay on this machine.

For PostgreSQL (production) this script does not apply: use pg_dump and pg_restore into an isolated database,
as in docs/DEPLOYMENT.md step 6, and compare the same per-table counts.
"""
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def counts(path):
    con = sqlite3.connect(path)
    try:
        tables = [r[0] for r in con.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name")]
        return {t: con.execute('select count(*) from "%s"' % t.replace('"', '""')).fetchone()[0] for t in tables}
    finally:
        con.close()


def drill(source):
    source = Path(source)
    if not source.is_file():
        return False, ['source database not found']
    with tempfile.TemporaryDirectory(prefix='mb-restore-drill-') as tmp:
        backup, restored = Path(tmp) / 'backup.sqlite3', Path(tmp) / 'restored.sqlite3'
        try:
            src = sqlite3.connect('file:%s?mode=ro' % source.resolve().as_posix(), uri=True)
            try:
                dst = sqlite3.connect(backup)
                try:
                    src.backup(dst)
                finally:
                    dst.close()
            finally:
                src.close()
            b, r = sqlite3.connect(backup), sqlite3.connect(restored)
            try:
                b.backup(r)
                integrity = r.execute('pragma integrity_check').fetchone()[0]
            finally:
                b.close()
                r.close()
            before, after = counts(source), counts(restored)
        except sqlite3.DatabaseError as error:
            return False, ['the database could not be backed up or read: ' + type(error).__name__]
    lines = ['%s: source %d, restored %d%s' % (t, before[t], after.get(t, -1), '' if before[t] == after.get(t) else '  MISMATCH') for t in before]
    ok = integrity == 'ok' and before == after
    lines.append('integrity_check: ' + integrity)
    return ok, lines


if __name__ == '__main__':
    ok, lines = drill(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'data' / 'mindbridge.sqlite3')
    print('\n'.join(lines))
    print('RESTORE DRILL ' + ('PASSED' if ok else 'FAILED'))
    sys.exit(0 if ok else 1)
