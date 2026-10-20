"""Same-origin, cookie sessions and owner-filtered CRUD. No JWT in localStorage."""
from datetime import datetime, timezone
import hmac
import re
import time
from typing import Literal

from fastapi import BackgroundTasks, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from .limits import SlidingWindowLimiter, client_key
from .mailer import Mailer
from .database import COOKIE, SESSION_SECONDS, DomainError, csrf_for

class StrictBody(BaseModel): model_config=ConfigDict(extra='forbid',strict=True)

class Credentials(StrictBody):
    username: str = Field(min_length=3,max_length=32,pattern=r'^[a-zA-Z0-9_-]+$')
    password: str = Field(min_length=12,max_length=128)
    @field_validator('username')
    @classmethod
    def normalize(cls,v): return v.lower()
    @field_validator('password')
    @classmethod
    def not_blank(cls,v):
        if not v.strip(): raise ValueError('Blank password')
        return v

class Record(StrictBody):
    client_id: str = Field(min_length=1,max_length=128,pattern=r'^[a-zA-Z0-9_-]+$')
    type: Literal['journal','gratitude','mood']
    text: str = Field(min_length=1,max_length=10000)
    at: str | None = Field(default=None,max_length=40)
    @model_validator(mode='after')
    def constraints(self):
        self.text=self.text.strip()
        if not self.text or (self.type!='journal' and len(self.text)>1000): raise ValueError('Invalid record text')
        if self.type=='mood' and self.text not in ['😫','😞','😐','🙂','🤩']: raise ValueError('Invalid mood')
        if self.at:
            dt=datetime.fromisoformat(self.at.replace('Z','+00:00'))
            if dt.tzinfo is None or dt.timestamp()<0 or dt.timestamp()>time.time()+300: raise ValueError('Invalid date')
        return self
    def storage(self):
        item=self.model_dump(exclude={'at'})
        if self.at: item['created_at']=int(datetime.fromisoformat(self.at.replace('Z','+00:00')).timestamp()*1000)
        return item

class Batch(StrictBody):
    entries: list[Record] = Field(min_length=1,max_length=100)
    @model_validator(mode='after')
    def unique_ids(self):
        if len(set(e.client_id for e in self.entries))!=len(self.entries): raise ValueError('Duplicate ID')
        if sum(len(e.text) for e in self.entries)>60000: raise ValueError('Batch too large')
        return self

class RecoverBody(StrictBody):
    username: str = Field(min_length=3,max_length=32,pattern=r'^[a-zA-Z0-9_-]+$')
    code: str = Field(min_length=1,max_length=40)
    new_password: str = Field(min_length=12,max_length=128)
    @field_validator('username')
    @classmethod
    def normalize(cls,v): return v.lower()
    @field_validator('new_password')
    @classmethod
    def not_blank(cls,v):
        if not v.strip(): raise ValueError('Blank password')
        return v

class EmailSet(StrictBody):
    password: str = Field(min_length=1,max_length=128)
    email: str = Field(min_length=3,max_length=254)

class TokenBody(StrictBody):
    token: str = Field(min_length=20,max_length=64,pattern=r'^[A-Za-z0-9_-]+$')

class ForgotBody(StrictBody):
    email: str = Field(min_length=1,max_length=254)

class ResetBody(TokenBody):
    new_password: str = Field(min_length=12,max_length=128)
    @field_validator('new_password')
    @classmethod
    def not_blank(cls,v):
        if not v.strip(): raise ValueError('Blank password')
        return v

class PasswordAction(StrictBody):
    password: str = Field(min_length=1,max_length=128)
class PasswordChange(PasswordAction):
    new_password: str = Field(min_length=12,max_length=128)
    @field_validator('new_password')
    @classmethod
    def not_blank(cls,v):
        if not v.strip(): raise ValueError('Blank password')
        return v


def attach_accounts(app,settings):
    auth_limiter=SlidingWindowLimiter(settings.auth_limit)
    # Failed sign-ins per account name (15 minutes). Complements the per-address limiter, which a
    # spread-out attacker avoids. Unknown names are counted identically, so the response never
    # reveals whether an account exists. Trade-off: someone can deliberately lock a name for the window.
    failure_limiter=SlidingWindowLimiter(settings.login_failures,window=900.0)

    app.state.mailer=Mailer.from_env()
    # At most five reset emails per address per hour, counted for known and unknown addresses alike.
    forgot_limiter=SlidingWindowLimiter(5,window=3600.0)

    def token(request): return request.cookies.get(COOKIE)

    def origin_for(request): return (settings.public_origin if settings.production else str(request.base_url).rstrip('/')).rstrip('/')

    def csrf(request):
        raw=token(request)
        if not raw: raise HTTPException(401,'not_authenticated')
        supplied=request.headers.get('X-CSRF-Token','')
        if not re.fullmatch(r'[0-9a-f]{64}',supplied) or not hmac.compare_digest(supplied,csrf_for(raw)): raise HTTPException(403,'csrf_required')

    async def read(request,model):
        if request.headers.get('X-MindBridge-Client')!='v5': raise HTTPException(403,'client_header_required')
        origin=request.headers.get('origin')
        if origin and origin!=(settings.public_origin if settings.production else str(request.base_url).rstrip('/')): raise HTTPException(403,'origin_not_allowed')
        if request.headers.get('content-type','').split(';')[0].strip()!='application/json': raise HTTPException(415,'json_required')
        body=bytearray()
        async for chunk in request.stream():
            if len(body)+len(chunk)>256000: raise HTTPException(413,'body_too_large')
            body.extend(chunk)
        try: return model.model_validate_json(bytes(body))
        except (ValidationError,ValueError): raise HTTPException(422,'invalid_request') from None

    async def db(request,method,*args):
        return await run_in_threadpool(getattr(request.app.state.database,method),*args)

    def rate_auth(request):
        retry=auth_limiter.hit(client_key(request,settings.trust_proxy_hops))
        if retry: raise HTTPException(429,'auth_rate_limit',headers={'Retry-After':str(retry)})

    def cookie_reply(data,new_token=None):
        response=JSONResponse(data)
        if new_token: response.set_cookie(COOKIE,new_token,max_age=SESSION_SECONDS,httponly=True,secure=settings.secure_cookies,samesite='strict',path='/')
        else: response.delete_cookie(COOKIE,httponly=True,secure=settings.secure_cookies,samesite='strict',path='/')
        return response

    @app.exception_handler(DomainError)
    async def domain_error(request,exc):
        request.state.error_code=exc.code
        return JSONResponse(status_code=exc.status,content={'error':{'code':exc.code},'request_id':request.state.request_id})

    @app.exception_handler(SQLAlchemyError)
    async def storage_error(request,exc):
        request.state.error_code='storage_unavailable'
        return JSONResponse(status_code=503,content={'error':{'code':'storage_unavailable'},'request_id':request.state.request_id})

    @app.get('/api/auth/me')
    async def me(request:Request):
        if not token(request): return {'user':None,'csrf':None}
        try: return await db(request,'me',token(request))
        except DomainError as exc:
            if exc.code=='not_authenticated': return cookie_reply({'user':None,'csrf':None})
            raise

    @app.post('/api/auth/register')
    async def register(request:Request):
        rate_auth(request);data=await read(request,Credentials)
        result,new_token=await db(request,'register',data.username,data.password,token(request))
        return cookie_reply(result,new_token)

    @app.post('/api/auth/login')
    async def login(request:Request):
        rate_auth(request);data=await read(request,Credentials)
        key='u:'+data.username
        retry=failure_limiter.peek(key)
        if retry: raise HTTPException(429,'auth_rate_limit',headers={'Retry-After':str(retry)})
        try: result,new_token=await db(request,'login',data.username,data.password,token(request))
        except DomainError as exc:
            if exc.code=='invalid_credentials': failure_limiter.hit(key)
            raise
        failure_limiter.reset(key)
        return cookie_reply(result,new_token)

    @app.post('/api/auth/recovery-code')
    async def recovery_code(request:Request):
        from .recovery import create_code
        rate_auth(request);data=await read(request,PasswordAction);csrf(request)
        response=JSONResponse(await run_in_threadpool(create_code,request.app.state.database,token(request),data.password))
        response.headers['Cache-Control']='no-store'
        return response

    @app.get('/api/auth/recovery')
    async def recovery_status(request:Request):
        from .recovery import status
        return await run_in_threadpool(status,request.app.state.database,token(request))

    @app.post('/api/auth/recover')
    async def recover(request:Request):
        from .recovery import recover as recover_account
        rate_auth(request);data=await read(request,RecoverBody)
        key='r:'+data.username
        retry=failure_limiter.peek(key)
        if retry: raise HTTPException(429,'auth_rate_limit',headers={'Retry-After':str(retry)})
        try: result,new_token=await run_in_threadpool(recover_account,request.app.state.database,data.username,data.code,data.new_password)
        except DomainError as exc:
            if exc.code=='invalid_recovery': failure_limiter.hit(key)
            raise
        failure_limiter.reset(key)
        response=cookie_reply(result,new_token)
        response.headers['Cache-Control']='no-store'
        return response

    def need_mail(request):
        if not request.app.state.mailer.enabled: raise HTTPException(503,'email_unavailable')

    @app.post('/api/auth/email')
    async def email_set(request:Request,background:BackgroundTasks):
        from .email_accounts import set_email
        rate_auth(request);data=await read(request,EmailSet);csrf(request);need_mail(request)
        verify_token,address=await run_in_threadpool(set_email,request.app.state.database,token(request),data.password,data.email)
        if verify_token:
            link=origin_for(request)+'/#verify='+verify_token
            background.add_task(request.app.state.mailer.send,address,'Confirm your MindBridge email','Open this link to confirm this address for password resets. It works once and expires in 24 hours:\n\n'+link+'\n\nIf you did not ask for this, ignore this message and nothing changes.')
        response=JSONResponse({'ok':True,'sent':bool(verify_token)});response.headers['Cache-Control']='no-store'
        return response

    @app.post('/api/auth/email/remove')
    async def email_remove(request:Request):
        from .email_accounts import remove_email
        rate_auth(request);data=await read(request,PasswordAction);csrf(request)
        return await run_in_threadpool(remove_email,request.app.state.database,token(request),data.password)

    @app.get('/api/auth/email')
    async def email_status(request:Request):
        from .email_accounts import status
        result=await run_in_threadpool(status,request.app.state.database,token(request))
        result['mail_enabled']=request.app.state.mailer.enabled
        return result

    @app.post('/api/auth/verify-email')
    async def email_verify(request:Request):
        from .email_accounts import verify
        rate_auth(request);data=await read(request,TokenBody)
        return await run_in_threadpool(verify,request.app.state.database,data.token)

    @app.post('/api/auth/forgot')
    async def forgot(request:Request,background:BackgroundTasks):
        from .email_accounts import request_reset,normalize
        rate_auth(request);data=await read(request,ForgotBody);need_mail(request)
        address=normalize(data.email)
        origin=origin_for(request);database=request.app.state.database;mailer=request.app.state.mailer
        def work():
            # Runs after the reply is sent: the answer and its timing are the same for every address.
            if forgot_limiter.hit('e:'+address): return
            found=request_reset(database,address)
            if found:
                mailer.send(found[1],'Reset your MindBridge password','Open this link to choose a new password. It works once and expires in 30 minutes:\n\n'+origin+'/#reset='+found[0]+'\n\nIf you did not ask for this, ignore this message: your password has not changed.')
        background.add_task(work)
        response=JSONResponse({'ok':True});response.headers['Cache-Control']='no-store'
        return response

    @app.post('/api/auth/reset')
    async def reset(request:Request):
        from .email_accounts import reset_password
        rate_auth(request);data=await read(request,ResetBody)
        key='x:'+data.token[:8]
        result,new_token=await run_in_threadpool(reset_password,request.app.state.database,data.token,data.new_password)
        response=cookie_reply(result,new_token);response.headers['Cache-Control']='no-store'
        return response

    @app.post('/api/auth/logout-all')
    async def logout_all(request:Request):
        rate_auth(request);data=await read(request,PasswordAction);csrf(request)
        result=await db(request,'logout_all',token(request),data.password)
        return cookie_reply(result)

    @app.post('/api/auth/logout')
    async def logout(request:Request):
        await read(request,StrictBody);csrf(request)
        result=await db(request,'logout',token(request))
        return cookie_reply(result)

    @app.post('/api/auth/password')
    async def password(request:Request):
        rate_auth(request);data=await read(request,PasswordChange);csrf(request)
        result=await db(request,'change_password',token(request),data.password,data.new_password)
        return cookie_reply(result)

    @app.post('/api/auth/delete')
    async def delete_account(request:Request):
        rate_auth(request);data=await read(request,PasswordAction);csrf(request)
        result=await db(request,'delete_account',token(request),data.password)
        return cookie_reply(result)

    @app.get('/api/entries')
    async def entries(request:Request,limit:int=Query(default=100,ge=1,le=100),offset:int=Query(default=0,ge=0,le=2000)):
        return await db(request,'list_entries',token(request),limit,offset)

    @app.post('/api/entries')
    async def create_record(request:Request):
        data=await read(request,Record);csrf(request)
        return await db(request,'save_entries',token(request),[data.storage()])

    @app.post('/api/entries/import')
    async def import_records(request:Request):
        data=await read(request,Batch);csrf(request)
        return await db(request,'save_entries',token(request),[e.storage() for e in data.entries])

    @app.post('/api/entries/{entry_id}/delete')
    async def delete_record(entry_id:str,request:Request):
        await read(request,StrictBody);csrf(request)
        if len(entry_id)>36: raise HTTPException(404,'entry_not_found')
        return await db(request,'delete_entry',token(request),entry_id)

    @app.get('/api/planner')
    async def planner_get(request:Request):
        from .planner import read_plan
        return await run_in_threadpool(read_plan,request.app.state.database,token(request))

    @app.post('/api/planner')
    async def planner_save(request:Request):
        from .planner import PlanBody, write_plan
        data=await read(request,PlanBody);csrf(request)
        return await run_in_threadpool(write_plan,request.app.state.database,token(request),data)

    @app.get('/api/account/export')
    async def export(request:Request):
        return JSONResponse(await db(request,'export',token(request)),headers={'Content-Disposition':'attachment; filename="mindbridge-account.json"'})
