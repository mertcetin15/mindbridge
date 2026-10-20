"""Outgoing email through any SMTP server. Off unless the operator configures it.

Environment (all optional; email features stay hidden and answer 503 until SMTP_HOST and SMTP_FROM are set):

    SMTP_HOST      the provider's server name
    SMTP_PORT      default 587
    SMTP_USER      login name, if the provider needs one
    SMTP_PASSWORD  its password or API key (kept in the host's secret store, never in the repository)
    SMTP_FROM      the sender address, for example "MindBridge <no-reply@your-domain>"
    SMTP_STARTTLS  "1" (default) upgrades the connection to TLS; "0" only for a local test server

Only account emails are sent (verify an address, reset a password). The message holds a single-use link and nothing
the person wrote. A failed send is logged as an event name only, never with the address or the link.
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

LOG = logging.getLogger('mindbridge')


class Mailer:
    def __init__(self, host='', port=587, user='', password='', sender='', starttls=True):
        self.host, self.port, self.user, self.password, self.sender, self.starttls = host, port, user, password, sender, starttls

    @classmethod
    def from_env(cls):
        env = os.environ
        try:
            port = int(env.get('SMTP_PORT', '587') or 587)
        except ValueError:
            port = 587
        return cls(env.get('SMTP_HOST', '').strip(), port, env.get('SMTP_USER', '').strip(), env.get('SMTP_PASSWORD', ''),
                   env.get('SMTP_FROM', '').strip(), env.get('SMTP_STARTTLS', '1').strip() != '0')

    @property
    def enabled(self):
        return bool(self.host and self.sender)

    def send(self, to, subject, body):
        """Blocking send; returns True or False. Never raises, never logs the address or the body."""
        if not self.enabled:
            return False
        message = EmailMessage()
        message['From'], message['To'], message['Subject'] = self.sender, to, subject
        message.set_content(body)
        try:
            with smtplib.SMTP(self.host, self.port, timeout=15) as smtp:
                if self.starttls:
                    smtp.starttls(context=ssl.create_default_context())
                if self.user:
                    smtp.login(self.user, self.password)
                smtp.send_message(message)
            return True
        except (OSError, smtplib.SMTPException):
            LOG.warning('{"event":"mail_send_failed"}')
            return False
