"""Validated, account-owned planner state with optimistic concurrency."""
from datetime import date
import json
from typing import Literal
from pydantic import Field, model_validator
from sqlalchemy import Text, Integer, String, ForeignKey, select, update
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.exc import IntegrityError
from .accounts import StrictBody
from .database import Base, DomainError

class Planner(Base):
    __tablename__='planners'
    user_id: Mapped[str]=mapped_column(String(36),ForeignKey('users.id',ondelete='CASCADE'),primary_key=True)
    revision: Mapped[int]=mapped_column(Integer,nullable=False)
    content: Mapped[str]=mapped_column(Text,nullable=False)

class Task(StrictBody):
    id: str=Field(min_length=1,max_length=64,pattern=r'^[a-zA-Z0-9_-]+$')
    title: str=Field(min_length=1,max_length=240)
    step: str=Field(default='',max_length=300)
    minutes: int=Field(ge=1,le=180)
    priority: Literal['normal','important']='normal'
    due: str=Field(default='',max_length=10)
    done: bool=False
    # Explicit step state. Older stored tasks have only `done`; the state is derived from it.
    status: Literal['planned','started','paused','partial','done','abandoned']|None=None
    status_at: str=Field(default='',max_length=10)   # day the state last changed, YYYY-MM-DD, or empty
    @model_validator(mode='after')
    def valid(self):
        self.title=self.title.strip();self.step=self.step.strip()
        if not self.title:raise ValueError('Blank task')
        if self.due:
            parsed=date.fromisoformat(self.due)
            if parsed.isoformat()!=self.due:raise ValueError('Invalid date')
        if self.status_at:
            if date.fromisoformat(self.status_at).isoformat()!=self.status_at:raise ValueError('Invalid date')
        if self.status is None:self.status='done' if self.done else 'planned'
        elif self.done!=(self.status=='done'):raise ValueError('done must match status')
        return self

class PlanBody(StrictBody):
    revision: int=Field(ge=0,le=2147483646)
    tasks: list[Task]=Field(max_length=100)
    @model_validator(mode='after')
    def unique(self):
        if len({task.id for task in self.tasks})!=len(self.tasks):raise ValueError('Duplicate task')
        return self


def read_plan(database,token):
    with database.Session() as session:
        user=database._user(session,token)
        row=session.get(Planner,user.id)
        return {'user_id':user.id,'revision':row.revision if row else 0,'tasks':json.loads(row.content) if row else []}


def write_plan(database,token,body):
    content=json.dumps([task.model_dump() for task in body.tasks],ensure_ascii=False)
    try:
        with database.Session.begin() as session:
            user=database._user(session,token,lock=True)
            row=session.get(Planner,user.id)
            if row is None:
                if body.revision!=0:raise DomainError('planner_conflict',409)
                session.add(Planner(user_id=user.id,revision=1,content=content))
            else:
                updated=session.execute(update(Planner).where(Planner.user_id==user.id,Planner.revision==body.revision).values(revision=body.revision+1,content=content))
                if updated.rowcount!=1:raise DomainError('planner_conflict',409)
            return {'user_id':user.id,'revision':body.revision+1,'tasks':json.loads(content)}
    except IntegrityError:raise DomainError('planner_conflict',409) from None
