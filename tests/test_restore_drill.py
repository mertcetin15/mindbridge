import sqlite3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import restore_drill


def make(path, rows=3):
    con = sqlite3.connect(path)
    con.execute('create table users (id integer primary key, name text)')
    con.execute('create table entries (id integer primary key, body text)')
    con.executemany('insert into entries(body) values (?)', [('secret %d' % i,) for i in range(rows)])
    con.execute("insert into users(name) values ('a')")
    con.commit()
    con.close()


def test_drill_passes_on_a_good_database_and_leaves_the_source_unchanged(tmp_path):
    db = tmp_path / 'a.sqlite3'
    make(db)
    before = db.read_bytes()
    ok, lines = restore_drill.drill(db)
    assert ok and 'integrity_check: ok' in lines and 'entries: source 3, restored 3' in lines
    assert db.read_bytes() == before


def test_drill_prints_counts_only_never_content(tmp_path):
    db = tmp_path / 'a.sqlite3'
    make(db)
    assert 'secret' not in '\n'.join(restore_drill.drill(db)[1])


def test_drill_fails_on_a_missing_or_corrupt_database(tmp_path):
    assert restore_drill.drill(tmp_path / 'none.sqlite3')[0] is False
    bad = tmp_path / 'bad.sqlite3'
    bad.write_bytes(b'not a database' * 100)
    try:
        ok = restore_drill.drill(bad)[0]
    except sqlite3.DatabaseError:
        ok = False
    assert ok is False
