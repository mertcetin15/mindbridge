import importlib.util
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app import Settings, create_app
from backend.planner import Planner

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('downgrade_planner', ROOT / 'scripts' / 'downgrade_planner.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)

H = {'X-MindBridge-Client': 'v5', 'Origin': 'http://localhost'}
TASKS = [
    {'id': 'a', 'title': 'Private task A', 'step': 'secret step', 'minutes': 10, 'priority': 'normal', 'due': '', 'done': False, 'status': 'partial', 'status_at': '2026-10-18'},
    {'id': 'b', 'title': 'Private task B', 'step': '', 'minutes': 5, 'priority': 'important', 'due': '2026-10-20', 'done': True, 'status': 'done', 'status_at': '2026-10-17'},
    {'id': 'c', 'title': 'Set aside', 'step': '', 'minutes': 5, 'priority': 'normal', 'due': '', 'done': False, 'status': 'abandoned', 'status_at': '2026-10-16'},
]


def seeded(tmp_path, name='alice'):
    app = create_app(Settings(database_url='sqlite+pysqlite:///' + str(tmp_path / 'd.db'), auth_limit=100))
    c = TestClient(app, base_url='http://localhost')
    c.__enter__()
    r = c.post('/api/auth/register', json={'username': name, 'password': 'long-test-password'}, headers=H)
    csrf = r.json()['csrf']
    assert c.post('/api/planner', json={'revision': 0, 'tasks': TASKS}, headers={**H, 'X-CSRF-Token': csrf}).status_code == 200
    return app, c


def stored(app):
    with app.state.database.Session() as s:
        return {row.user_id: (row.revision, json.loads(row.content)) for row in s.scalars(select(Planner)).all()}


# The planner Task model exactly as it was before step states existed (v19 and earlier), copied from that release.
# It forbids unknown fields, which is why a rollback needs scripts/downgrade_planner.py. Kept as text so this test
# runs everywhere and does not depend on any archive being present.
ORIGINAL_TASK_SOURCE = """
class Task(StrictBody):
    id: str=Field(min_length=1,max_length=64,pattern=r'^[a-zA-Z0-9_-]+$')
    title: str=Field(min_length=1,max_length=240)
    step: str=Field(default='',max_length=300)
    minutes: int=Field(ge=1,le=180)
    priority: Literal['normal','important']='normal'
    due: str=Field(default='',max_length=10)
    done: bool=False
    @model_validator(mode='after')
    def valid(self):
        self.title=self.title.strip();self.step=self.step.strip()
        if not self.title:raise ValueError('Blank task')
        if self.due:
            parsed=date.fromisoformat(self.due)
            if parsed.isoformat()!=self.due:raise ValueError('Invalid date')
        return self
"""


def original_task_model():
    from datetime import date
    from typing import Literal
    from pydantic import Field, model_validator
    from backend.accounts import StrictBody
    namespace = {'date': date, 'Literal': Literal, 'Field': Field, 'model_validator': model_validator, 'StrictBody': StrictBody}
    exec(compile(ORIGINAL_TASK_SOURCE, 'original_task', 'exec'), namespace)
    return namespace['Task']

def test_a_dry_run_reports_counts_and_changes_nothing(tmp_path):
    app, c = seeded(tmp_path)
    before = stored(app)
    summary = tool.run(app.state.database, apply=False)
    assert summary == {'rows': 1, 'rows_changed': 1, 'tasks_changed': 3}
    assert stored(app) == before
    c.__exit__(None, None, None)


def test_applying_removes_only_the_new_fields_and_keeps_done_and_the_revision(tmp_path):
    app, c = seeded(tmp_path)
    (revision_before, _), = stored(app).values()
    tool.run(app.state.database, apply=True)
    (revision, tasks), = stored(app).values()
    assert revision == revision_before, 'the next save still passes the conflict check'
    assert all('status' not in t and 'status_at' not in t for t in tasks)
    assert [(t['id'], t['done'], t['title']) for t in tasks] == [('a', False, 'Private task A'), ('b', True, 'Private task B'), ('c', False, 'Set aside')]
    c.__exit__(None, None, None)


def test_it_is_idempotent(tmp_path):
    app, c = seeded(tmp_path)
    tool.run(app.state.database, apply=True)
    again = tool.run(app.state.database, apply=True)
    assert again == {'rows': 1, 'rows_changed': 0, 'tasks_changed': 0}
    c.__exit__(None, None, None)


def test_rows_written_before_states_existed_are_left_alone(tmp_path):
    app, c = seeded(tmp_path)
    tool.run(app.state.database, apply=True)
    clean = stored(app)
    with TestClient(app, base_url='http://localhost') as c2:
        r = c2.post('/api/auth/register', json={'username': 'bobby', 'password': 'long-test-password'}, headers=H)
        c2.post('/api/planner', json={'revision': 0, 'tasks': [{'id': 'z', 'title': 'Fresh', 'step': '', 'minutes': 5, 'priority': 'normal', 'due': '', 'done': False}]}, headers={**H, 'X-CSRF-Token': r.json()['csrf']})
    summary = tool.run(app.state.database, apply=False)
    assert summary['rows'] == 2 and summary['rows_changed'] == 1, 'the new account saved with this release still carries fields; the cleaned one does not'
    c.__exit__(None, None, None)


def test_the_original_backend_rejects_what_this_release_saves_and_accepts_it_after_the_tool_runs(tmp_path):
    Task = original_task_model()
    from pydantic import ValidationError
    app, c = seeded(tmp_path)
    (_, before), = stored(app).values()
    with pytest.raises(ValidationError):
        Task(**before[0])
    tool.run(app.state.database, apply=True)
    (_, after), = stored(app).values()
    for t in after:
        assert Task(**t).id == t['id']
    c.__exit__(None, None, None)


def test_it_refuses_to_change_data_without_the_backup_flag(capsys):
    assert tool.main(['--apply']) == 2
    assert 'Refusing' in capsys.readouterr().out


def test_it_never_prints_task_text(tmp_path, monkeypatch, capsys):
    app, c = seeded(tmp_path)
    url = 'sqlite+pysqlite:///' + str(tmp_path / 'd.db')
    monkeypatch.setenv('DATABASE_URL', url)
    c.__exit__(None, None, None)
    assert tool.main([]) == 0
    out = capsys.readouterr().out
    assert 'DRY RUN' in out and '1 planner rows' in out
    for secret in ('Private task', 'secret step', 'alice'):
        assert secret not in out
    assert tool.main(['--apply', '--i-have-a-backup']) == 0
    assert 'APPLIED' in capsys.readouterr().out
