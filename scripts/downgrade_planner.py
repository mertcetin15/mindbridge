"""Make stored planner data readable by the release before step states existed (v19 and earlier).

Use this only if you roll the application back to an older release after people have saved planner steps with
this release. The older server refuses any task that carries `status` or `status_at`, so saving a plan would
fail until they are removed.

    python scripts/downgrade_planner.py                         # dry run: counts only, changes nothing
    python scripts/downgrade_planner.py --apply --i-have-a-backup

It reads DATABASE_URL like the application does. It prints counts only, never task text. What is lost: the
finer states. `done` stays exactly as it is, so completed steps stay completed; started, paused, partly done and
set-aside steps all return as ordinary open steps. Running it twice changes nothing the second time. Back up the
database first and read docs/RUNBOOK.md.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

NEW_FIELDS = ('status', 'status_at')


def strip(tasks):
    """Return (tasks without the new fields, number of tasks that carried one)."""
    changed = 0
    out = []
    for task in tasks:
        if isinstance(task, dict) and any(k in task for k in NEW_FIELDS):
            changed += 1
            task = {k: v for k, v in task.items() if k not in NEW_FIELDS}
        out.append(task)
    return out, changed


def run(database, apply=False):
    """Returns {'rows': planner rows seen, 'rows_changed': rows needing a rewrite, 'tasks_changed': tasks affected}."""
    from sqlalchemy import select, update
    from backend.planner import Planner

    summary = {'rows': 0, 'rows_changed': 0, 'tasks_changed': 0}
    with database.Session.begin() as session:
        for row in session.scalars(select(Planner)).all():
            summary['rows'] += 1
            tasks = json.loads(row.content)
            cleaned, changed = strip(tasks)
            if not changed:
                continue
            summary['rows_changed'] += 1
            summary['tasks_changed'] += changed
            if apply:
                # Same revision on purpose: the person's next save still passes the conflict check.
                session.execute(update(Planner).where(Planner.user_id == row.user_id).values(content=json.dumps(cleaned, ensure_ascii=False)))
    return summary


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    apply = '--apply' in args
    if apply and '--i-have-a-backup' not in args:
        print('Refusing to change data without --i-have-a-backup. Take a backup of the database first.')
        return 2
    from backend.app import Settings
    from backend.database import Database

    url = Settings.environment().database_url
    database = Database(url)
    try:
        database.initialize(auto_migrate=False)
        summary = run(database, apply)
    finally:
        database.close()
    mode = 'APPLIED' if apply else 'DRY RUN (nothing changed)'
    print(f"{mode}: {summary['rows']} planner rows, {summary['rows_changed']} need changes, {summary['tasks_changed']} tasks carry a state field")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
