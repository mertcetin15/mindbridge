"""Optional account email: verify an address, then reset a forgotten password by a single-use link.

Properties (each has a test):
* The address is optional and added only after sign-up, by a signed-in person who types the current password.
* Only a *verified* address can reset a password, so nobody can claim someone else's address by typing it.
* Links hold a 256-bit random token; only its SHA-256 is stored. Verify links last 24 hours, reset links 30 minutes.
  A token works once. Asking for a new reset link cancels the older one. A used reset signs out every device.
* "Forgot password" answers the same way for a known and an unknown address, and the work happens after the answer is
  sent, so neither the reply nor its time shows whether an account exists.
* Changing or removing the address cancels pending links for it; deleting the account deletes the address (cascade).
"""
import hashlib
import hmac
import re
import secrets
import time

from sqlalchemy import BigInteger, ForeignKey, Index, String, delete, select
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base, DomainError, HASHER, LoginSession, User, csrf_for

VERIFY_SECONDS = 24 * 3600
RESET_SECONDS = 30 * 60
_EMAIL = re.compile(r'^[^@\s<>"\',;:()\[\]\\]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?\.[A-Za-z]{2,}$')


class UserEmail(Base):
    __tablename__ = 'user_emails'
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


class EmailToken(Base):
    __tablename__ = 'email_tokens'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(8), nullable=False)    # 'verify' or 'reset'
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)


def normalize(address: str) -> str:
    return str(address).strip().lower()


def valid_address(address: str) -> bool:
    return len(address) <= 254 and bool(_EMAIL.match(address))


def mask(address: str) -> str:
    name, _, domain = address.partition('@')
    return (name[:1] + '***@' + domain) if name else address


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _issue(s, user_id, purpose, seconds):
    s.execute(delete(EmailToken).where(EmailToken.user_id == user_id, EmailToken.purpose == purpose))
    token = secrets.token_urlsafe(32)
    s.add(EmailToken(token_hash=_digest(token), user_id=user_id, purpose=purpose, expires_at=int(time.time()) + seconds))
    return token


def _take(s, token, purpose):
    """Return the token row if it exists, is of this purpose and unexpired; the caller deletes it."""
    if not isinstance(token, str) or not re.fullmatch(r'[A-Za-z0-9_-]{20,64}', token):
        return None
    row = s.get(EmailToken, _digest(token))
    if row is None or not hmac.compare_digest(row.token_hash, _digest(token)) or row.purpose != purpose or row.expires_at <= int(time.time()):
        return None
    return row


def set_email(database, token, password, address):
    """Save an unverified address and return (verify_token, normalized_address)."""
    address = normalize(address)
    if not valid_address(address):
        raise DomainError('invalid_request', 422)
    with database.Session.begin() as s:
        user = database._user(s, token, lock=True)
        if not database._verify(user.password_hash, password):
            raise DomainError('invalid_credentials', 401)
        row = s.get(UserEmail, user.id)
        if row is None:
            s.add(UserEmail(user_id=user.id, email=address, verified_at=None, created_at=int(time.time())))
        elif row.email != address:
            row.email, row.verified_at = address, None
        elif row.verified_at:
            return None, address            # already verified: nothing to send
        s.execute(delete(EmailToken).where(EmailToken.user_id == user.id, EmailToken.purpose == 'reset'))
        return _issue(s, user.id, 'verify', VERIFY_SECONDS), address


def remove_email(database, token, password):
    with database.Session.begin() as s:
        user = database._user(s, token, lock=True)
        if not database._verify(user.password_hash, password):
            raise DomainError('invalid_credentials', 401)
        s.execute(delete(EmailToken).where(EmailToken.user_id == user.id))
        s.execute(delete(UserEmail).where(UserEmail.user_id == user.id))
    return {'ok': True}


def status(database, token):
    with database.Session() as s:
        user = database._user(s, token)
        row = s.get(UserEmail, user.id)
        if row is None:
            return {'has_email': False}
        return {'has_email': True, 'email': mask(row.email), 'verified': row.verified_at is not None}


def verify(database, raw_token):
    with database.Session.begin() as s:
        row = _take(s, raw_token, 'verify')
        if row is None:
            raise DomainError('invalid_link', 400)
        entry = s.get(UserEmail, row.user_id)
        s.delete(row)
        if entry is None:
            raise DomainError('invalid_link', 400)
        taken = s.scalar(select(UserEmail.user_id).where(UserEmail.email == entry.email, UserEmail.verified_at.is_not(None), UserEmail.user_id != entry.user_id))
        if taken:
            raise DomainError('email_in_use', 409)
        entry.verified_at = int(time.time())
        # Anyone else who typed this address without proving it loses it.
        s.execute(delete(UserEmail).where(UserEmail.email == entry.email, UserEmail.user_id != entry.user_id, UserEmail.verified_at.is_(None)))
    return {'ok': True}


def request_reset(database, address):
    """Return (reset_token, address) when a verified account owns the address, otherwise None. Called after the reply."""
    address = normalize(address)
    if not valid_address(address):
        return None
    with database.Session.begin() as s:
        row = s.scalar(select(UserEmail).where(UserEmail.email == address, UserEmail.verified_at.is_not(None)))
        if row is None:
            return None
        return _issue(s, row.user_id, 'reset', RESET_SECONDS), address


def reset_password(database, raw_token, new_password):
    with database.Session.begin() as s:
        row = _take(s, raw_token, 'reset')
        if row is None:
            raise DomainError('invalid_link', 400)
        user = s.scalar(select(User).where(User.id == row.user_id).with_for_update())
        if user is None:
            raise DomainError('invalid_link', 400)
        user.password_hash = HASHER.hash(new_password)
        s.execute(delete(EmailToken).where(EmailToken.user_id == user.id, EmailToken.purpose == 'reset'))
        s.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
        new_token = database._new_session(s, user.id)
        return {'user': {'id': user.id, 'username': user.username}, 'csrf': csrf_for(new_token)}, new_token
