"""Account-scoped storage. Plaintext journal content; salted Argon2id passwords.
SQLAlchemy supports SQLite for local use and PostgreSQL through psycopg.
"""
from __future__ import annotations
import hashlib
import hmac
import secrets
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from sqlalchemy import (create_engine, event, select, delete, func, ForeignKey,
                        String, Text, BigInteger, UniqueConstraint, Index)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

COOKIE = 'mb_session'
SESSION_SECONDS = 12 * 3600
MAX_ENTRIES = 2000
HASHER = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
DUMMY_HASH = HASHER.hash('not-a-real-user-password')

class DomainError(Exception):
    def __init__(self, code, status=400):
        self.code, self.status = code, status

class Base(DeclarativeBase): pass

class SchemaVersion(Base):
    __tablename__ = 'schema_version'
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[int]

class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)

class LoginSession(Base):
    __tablename__ = 'login_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)

class Entry(Base):
    __tablename__ = 'entries'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    client_id: Mapped[str] = mapped_column(String(128), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'client_id', name='uq_entry_user_client'),
                     Index('ix_entries_user_date', 'user_id', 'created_at', 'id'))


def digest(token): return hashlib.sha256(token.encode()).hexdigest()
def csrf_for(token): return hashlib.sha256(('mindbridge-csrf:' + token).encode()).hexdigest()
def utc_string(ms): return datetime.fromtimestamp(ms/1000, timezone.utc).isoformat().replace('+00:00', 'Z')
def entry_json(e): return {'id':e.id, 'client_id':e.client_id, 'type':e.kind, 'text':e.content, 'at':utc_string(e.created_at)}

class Database:
    def __init__(self, url: str):
        if not (url.startswith('sqlite+pysqlite:///') or url.startswith('postgresql+psycopg://')):
            raise ValueError('Use sqlite+pysqlite or postgresql+psycopg')
        kwargs = {'pool_pre_ping': True}
        if url.startswith('postgresql'):
            # Bounded pool, recycled before managed-Postgres idle timeouts drop connections.
            kwargs.update(pool_size=5, max_overflow=5, pool_recycle=1800, pool_timeout=10)
        if url.startswith('sqlite'):
            kwargs['connect_args']={'check_same_thread':False,'timeout':15}
            if url.endswith(':memory:'): kwargs['poolclass']=StaticPool
            else:
                file = url.removeprefix('sqlite+pysqlite:///')
                Path(file).parent.mkdir(parents=True,exist_ok=True)
        self.engine = create_engine(url,**kwargs)
        if url.startswith('sqlite'):
            @event.listens_for(self.engine,'connect')
            def sqlite_foreign_keys(connection, _):
                connection.execute('PRAGMA foreign_keys=ON')
                if not url.endswith(':memory:'):
                    # WAL lets readers proceed during a write; NORMAL sync is safe under WAL.
                    connection.execute('PRAGMA journal_mode=WAL')
                    connection.execute('PRAGMA synchronous=NORMAL')
                    connection.execute('PRAGMA busy_timeout=15000')
        self.Session = sessionmaker(self.engine, expire_on_commit=False)

    def initialize(self, auto_migrate=True):
        from .migrate import migrate_engine, check_engine
        if auto_migrate: migrate_engine(self.engine)
        else: check_engine(self.engine)
        with self.Session.begin() as s:
            version=s.get(SchemaVersion,1)
            if version is None: s.add(SchemaVersion(id=1,version=1))
            elif version.version != 1: raise RuntimeError('Unsupported schema; migrate before starting')
            s.execute(delete(LoginSession).where(LoginSession.expires_at<=int(time.time())))

    def close(self): self.engine.dispose()

    def ping(self):
        with self.engine.connect() as c: c.execute(select(1))

    def purge_expired(self):
        with self.Session.begin() as s:
            return s.execute(delete(LoginSession).where(LoginSession.expires_at<=int(time.time()))).rowcount

    def _user(self, s, token, lock=False):
        if not token or len(token)>128: raise DomainError('not_authenticated',401)
        session=s.get(LoginSession,digest(token))
        if session is None or session.expires_at <= int(time.time()): raise DomainError('not_authenticated',401)
        user=s.scalar(select(User).where(User.id==session.user_id).with_for_update()) if lock else s.get(User,session.user_id)
        if user is None: raise DomainError('not_authenticated',401)
        return user

    def _verify(self, encoded, password):
        try: return HASHER.verify(encoded,password)
        except (VerificationError,InvalidHashError): return False

    def _new_session(self,s,user_id,old_token=None):
        if old_token: s.execute(delete(LoginSession).where(LoginSession.token_hash==digest(old_token)))
        s.execute(delete(LoginSession).where(LoginSession.expires_at<=int(time.time())))
        # Bound valid sessions to the ten most recent for this account.
        tokens=s.scalars(select(LoginSession).where(LoginSession.user_id==user_id).order_by(LoginSession.expires_at.desc())).all()
        for old in tokens[9:]: s.delete(old)
        token=secrets.token_urlsafe(32)
        s.add(LoginSession(token_hash=digest(token),user_id=user_id,expires_at=int(time.time())+SESSION_SECONDS))
        return token

    def register(self, username,password,old_token=None):
        password_hash=HASHER.hash(password)
        try:
            with self.Session.begin() as s:
                if s.scalar(select(User.id).where(User.username==username)): raise DomainError('username_unavailable',409)
                user=User(id=str(uuid.uuid4()),username=username,password_hash=password_hash,created_at=int(time.time()*1000))
                s.add(user);s.flush();token=self._new_session(s,user.id,old_token)
                return {'user':{'id':user.id,'username':user.username},'csrf':csrf_for(token)},token
        except IntegrityError: raise DomainError('username_unavailable',409) from None

    def login(self,username,password,old_token=None):
        with self.Session.begin() as s:
            user=s.scalar(select(User).where(User.username==username).with_for_update())
            valid=self._verify(user.password_hash if user else DUMMY_HASH,password)
            if not user or not valid: raise DomainError('invalid_credentials',401)
            if HASHER.check_needs_rehash(user.password_hash): user.password_hash=HASHER.hash(password)
            token=self._new_session(s,user.id,old_token)
            return {'user':{'id':user.id,'username':user.username},'csrf':csrf_for(token)},token

    def me(self,token):
        with self.Session() as s:
            user=self._user(s,token)
            return {'user':{'id':user.id,'username':user.username},'csrf':csrf_for(token)}

    def logout(self,token):
        with self.Session.begin() as s:
            if token: s.execute(delete(LoginSession).where(LoginSession.token_hash==digest(token)))
        return {'ok':True}

    def logout_all(self,token,password):
        """Sign out every device. Re-authentication is required because it is a sensitive action."""
        with self.Session.begin() as s:
            user=self._user(s,token,lock=True)
            if not self._verify(user.password_hash,password): raise DomainError('invalid_credentials',401)
            revoked=s.execute(delete(LoginSession).where(LoginSession.user_id==user.id)).rowcount
        return {'ok':True,'revoked':revoked}

    def list_entries(self,token,limit=100,offset=0):
        with self.Session() as s:
            user=self._user(s,token)
            total=s.scalar(select(func.count()).select_from(Entry).where(Entry.user_id==user.id))
            entries=s.scalars(select(Entry).where(Entry.user_id==user.id).order_by(Entry.created_at.desc(),Entry.id.desc()).offset(offset).limit(limit)).all()
            return {'user_id':user.id,'entries':[entry_json(e) for e in entries],'total':total,'offset':offset,'limit':limit}

    def save_entries(self,token,items):
        # The whole batch is atomic. Client IDs make retry/import idempotent.
        try:
            with self.Session.begin() as s:
                user=self._user(s,token)
                s.execute(select(User.id).where(User.id==user.id).with_for_update())
                count=s.scalar(select(func.count()).select_from(Entry).where(Entry.user_id==user.id))
                result=[]
                for item in items:
                    existing=s.scalar(select(Entry).where(Entry.user_id==user.id,Entry.client_id==item['client_id']))
                    if existing:
                        if existing.kind!=item['type'] or existing.content!=item['text']: raise DomainError('client_id_conflict',409)
                        result.append(entry_json(existing));continue
                    if count>=MAX_ENTRIES: raise DomainError('entry_limit',409)
                    e=Entry(id=str(uuid.uuid4()),user_id=user.id,client_id=item['client_id'],kind=item['type'],content=item['text'],created_at=item.get('created_at', int(time.time()*1000)))
                    s.add(e);s.flush();count+=1;result.append(entry_json(e))
                return {'entries':result}
        except IntegrityError: raise DomainError('entry_conflict',409) from None

    def delete_entry(self,token,entry_id):
        with self.Session.begin() as s:
            user=self._user(s,token)
            result=s.execute(delete(Entry).where(Entry.id==entry_id,Entry.user_id==user.id))
            if result.rowcount!=1: raise DomainError('entry_not_found',404)
        return {'ok':True}

    def export(self,token):
        with self.Session() as s:
            user=self._user(s,token)
            entries=s.scalars(select(Entry).where(Entry.user_id==user.id).order_by(Entry.created_at,Entry.id)).all()
            from .planner import Planner
            import json
            plan=s.get(Planner,user.id)
            return {'version':2,'user_id':user.id,'username':user.username,'exported_at':utc_string(int(time.time()*1000)),'entries':[entry_json(e) for e in entries],'planner':json.loads(plan.content) if plan else []}

    def change_password(self,token,current_password,new_password):
        with self.Session.begin() as s:
            user=self._user(s,token,lock=True)
            if not self._verify(user.password_hash,current_password): raise DomainError('invalid_credentials',401)
            user.password_hash=HASHER.hash(new_password)
            s.execute(delete(LoginSession).where(LoginSession.user_id==user.id))
        return {'ok':True}

    def delete_account(self,token,password):
        with self.Session.begin() as s:
            user=self._user(s,token,lock=True)
            if not self._verify(user.password_hash,password): raise DomainError('invalid_credentials',401)
            s.delete(user) # DB foreign-key cascades remove sessions and records atomically.
        return {'ok':True}
