"""Account recovery without an email address: a one-time recovery code the person keeps themselves.

Why a code and not email: MindBridge stores no email address and has no way to send mail, so a reset link
cannot exist. Instead a signed-in person may create a recovery code (shown once, never stored in readable form).
If they later forget the password, the username plus the code lets them choose a new one.

Properties (each has a test):
* 100 random bits, shown once; only an Argon2id hash is stored. Creating a new code replaces the old one.
* Single use: a successful recovery deletes the code, signs out every device and starts one new session.
* Expires after 365 days.
* A wrong name, a missing code, an expired code and a wrong code all give the same answer, and the same work is
  done in every case, so the response does not reveal whether an account or a code exists.
* Creating a code needs the current password (a sensitive action); recovery attempts are rate-limited per
  address and per name like sign-in.
Losing both the password and the code means the account cannot be recovered; this is stated in the interface.
"""
import re
import secrets
import time

from sqlalchemy import BigInteger, ForeignKey, String, delete, select
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base, DomainError, DUMMY_HASH, HASHER, LoginSession, User, csrf_for

ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   # 32 symbols, no 0/O/1/I
GROUPS, GROUP_SIZE = 4, 5                         # 20 symbols = 100 bits
RECOVERY_SECONDS = 365 * 24 * 3600


class RecoveryCode(Base):
    __tablename__ = 'recovery_codes'
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    code_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


def normalize(code: str) -> str:
    return re.sub(r'[\s-]+', '', str(code)).upper()


def format_code(raw: str) -> str:
    return '-'.join(raw[i:i + GROUP_SIZE] for i in range(0, len(raw), GROUP_SIZE))


def new_code() -> str:
    return format_code(''.join(secrets.choice(ALPHABET) for _ in range(GROUPS * GROUP_SIZE)))


def well_formed(raw: str) -> bool:
    return len(raw) == GROUPS * GROUP_SIZE and all(c in ALPHABET for c in raw)


def create_code(database, token, password):
    with database.Session.begin() as s:
        user = database._user(s, token, lock=True)
        if not database._verify(user.password_hash, password):
            raise DomainError('invalid_credentials', 401)
        code = new_code()
        digest = HASHER.hash(normalize(code))
        row = s.get(RecoveryCode, user.id)
        if row is None:
            s.add(RecoveryCode(user_id=user.id, code_hash=digest, created_at=int(time.time())))
        else:
            row.code_hash, row.created_at = digest, int(time.time())
    return {'code': code, 'valid_days': RECOVERY_SECONDS // 86400}


def status(database, token):
    with database.Session() as s:
        user = database._user(s, token)
        row = s.get(RecoveryCode, user.id)
        if row is None:
            return {'has_code': False}
        return {'has_code': row.created_at + RECOVERY_SECONDS > int(time.time()), 'created_at': row.created_at}


def recover(database, username, code, new_password):
    raw = normalize(code)
    with database.Session.begin() as s:
        user = s.scalar(select(User).where(User.username == username).with_for_update())
        row = s.get(RecoveryCode, user.id) if user else None
        fresh = bool(row) and row.created_at + RECOVERY_SECONDS > int(time.time())
        # The same Argon2 verification runs whether or not a name, a code or a fresh code exists.
        valid = database._verify(row.code_hash if (row and fresh) else DUMMY_HASH, raw if well_formed(raw) else 'x')
        if not (user and row and fresh and valid and well_formed(raw)):
            raise DomainError('invalid_recovery', 401)
        user.password_hash = HASHER.hash(new_password)
        s.delete(row)   # single use
        s.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
        new_token = database._new_session(s, user.id)
        return {'user': {'id': user.id, 'username': user.username}, 'csrf': csrf_for(new_token), 'recovery_code_used': True}, new_token
