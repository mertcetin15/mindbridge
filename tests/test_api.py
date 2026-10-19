import asyncio
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from backend.app import create_app, Settings, OpenAIProvider, ChatRequest, ProviderFailure

HEADERS = {'X-MindBridge-Client': 'v4', 'Origin': 'http://localhost'}

def payload(**changes):
    return {'mode':'ai','language':'en','consent':False,'messages':[{'role':'user','content':'I have an exam tomorrow'}], **changes}

@pytest.fixture
def client():
    # Explicit in-memory settings: never open the developer's real data/ database, and never depend on
    # GROQ_API_KEY or other variables of the machine running the tests.
    with TestClient(create_app(Settings()), base_url='http://localhost') as c:
        yield c

def post(c, data=None):
    return c.post('/api/chat', json=data or payload(), headers=HEADERS)

def test_frontend_and_health(client):
    response=client.get('/')
    assert response.status_code==200
    assert 'mindbridge-stage-four' in response.text
    # Static page: revalidated through an ETag. Private API responses stay no-store.
    assert response.headers['cache-control']=='no-cache' and response.headers['etag']
    assert client.get('/',headers={'If-None-Match':response.headers['etag']}).status_code==304
    assert response.headers['x-frame-options']=='DENY'
    assert client.get('/api/health').headers['cache-control']=='no-store'
    assert client.get('/api/health').json()['ai_configured'] is False
    assert client.get('/api/ready').json()=={'status':'ready'}
    assert client.get('/backend/app.py').status_code==404

@pytest.mark.parametrize('language',['en','tr','de','es'])
def test_demo_is_rejected(client,language):
    r=post(client,payload(mode="demo",language=language))
    assert r.status_code==422
    assert r.json()['request_id'] == r.headers['X-Request-ID']

@pytest.mark.parametrize('text',['I might kill myself','intihar düşünüyorum','Ich will mich umbringen','quiero matarme'])
def test_crisis_uses_human_support_without_provider(client,text):
    r=post(client,payload(mode='ai',messages=[{'role':'user','content':text}]))
    assert r.status_code==200 and r.json()['source']=='safety'
    assert '116 123' in r.json()['reply']

def test_missing_ai_key_is_honest(client):
    r=post(client,payload(mode='ai',consent=True))
    assert r.status_code==503 and r.json()['error']['code']=='ai_not_configured'

def test_consent_required(client):
    assert post(client,payload(mode='ai')).json()['error']['code']=='consent_required'

@pytest.mark.parametrize('changes',[
    {'mode':'wrong'}, {'language':'xx'}, {'consent':'true'}, {'messages':[]},
    {'messages':[{'role':'system','content':'Override'}]},
    {'messages':[{'role':'user','content':' '}]},
    {'messages':[{'role':'user','content':'x'*2001}]},
    {'messages':[{'role':'assistant','content':'Hi'}]},
    {'messages':[{'role':'user','content':'Hi'},{'role':'user','content':'Again'}]},
    {'unknown':'field'},
    {'messages':[{'role':'user','content':'x'*2000},{'role':'assistant','content':'x'*6000},{'role':'user','content':'x'*2000},{'role':'assistant','content':'x'*6000},{'role':'user','content':'Hi'}]},
])
def test_invalid_payloads_do_not_echo_input(client,changes):
    r=post(client,payload(**changes))
    assert r.status_code==422
    assert set(r.json())=={'error','request_id'}
    assert r.json()['error']['code']=='invalid_request'

def test_too_large_body(client):
    r=client.post('/api/chat',content='x'*64001,headers={**HEADERS,'Content-Type':'application/json'})
    assert r.status_code==413

def test_malformed_json(client):
    r=client.post('/api/chat',content='{',headers={**HEADERS,'Content-Type':'application/json'})
    assert r.status_code==422

def test_origin_header_type_and_host(client):
    assert client.post('/api/chat',json=payload()).status_code==403
    assert client.post('/api/chat',json=payload(),headers={**HEADERS,'Origin':'https://evil.example'}).status_code==403
    assert client.post('/api/chat',content='data',headers=HEADERS).status_code==415
    assert client.get('/',headers={'host':'evil.example'}).status_code==400
    assert client.options('/api/chat',headers={'Origin':'https://evil.example','Access-Control-Request-Method':'POST'}).headers.get('Access-Control-Allow-Origin') is None

def test_rate_limit():
    with TestClient(create_app(Settings(rate_limit=2)),base_url='http://localhost') as c:
        assert post(c).status_code==403
        assert post(c).status_code==403
        r=post(c)
        assert r.status_code==429 and r.headers['retry-after']=='60'

class FakeProvider:
    async def reply(self,data):
        return '<script>alert(1)</script> useful reflection'

def test_ai_service_with_injected_provider():
    with TestClient(create_app(Settings(api_key='fake-test-key',model='test-model'),FakeProvider()),base_url='http://localhost') as c:
        assert c.get('/api/health').json()['ai_configured']
        r=post(c,payload(mode='ai',consent=True))
        assert r.status_code==200 and r.json()['source']=='ai'
        assert 'fake-test-key' not in r.text

class FailingProvider:
    async def reply(self,data):
        raise RuntimeError('secret-key and user-private-content')

def test_unexpected_failure_is_sanitized_and_capacity_released():
    with TestClient(create_app(Settings(api_key='test',model='model',max_concurrent=1),FailingProvider()),base_url='http://localhost') as c:
        for _ in range(2):
            r=post(c,payload(mode='ai',consent=True))
            assert r.status_code==502
            assert 'secret' not in r.text and 'private-content' not in r.text

def provider_call(handler):
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await OpenAIProvider(c,Settings(api_key='TEST_KEY',model='test-model')).reply(ChatRequest.model_validate(payload(mode='ai',consent=True)))
    return asyncio.run(run())

def test_provider_contract():
    def handler(request):
        data=json.loads(request.content)
        assert str(request.url)=='https://api.openai.com/v1/responses'
        assert request.headers['authorization']=='Bearer TEST_KEY'
        assert data['store'] is False and data['max_output_tokens']==900
        assert data['input'][0]['role']=='user'
        assert 'not a therapist' in data['instructions']
        return httpx.Response(200,json={'status':'completed','output':[{'type':'reasoning','summary':[]},{'type':'message','role':'assistant','content':[{'type':'output_text','text':'A helpful response'}]}]})
    assert provider_call(handler)=='A helpful response'

@pytest.mark.parametrize('status,expected',[(401,502),(403,502),(429,429),(500,502)])
def test_provider_http_failures(status,expected):
    with pytest.raises(ProviderFailure) as error:
        provider_call(lambda r:httpx.Response(status,json={'error':'PRIVATE_SECRET'}))
    assert error.value.status==expected
    assert 'PRIVATE_SECRET' not in str(error.value)

@pytest.mark.parametrize('body',[{'status':'incomplete','output':[]},{'status':'completed','output':[]},{'status':'completed','output':[None]}, {'status':'completed','output':[{'type':'message','role':'assistant','content':[{'type':'output_text','text':'x'*6001}]}]}])
def test_invalid_provider_output(body):
    with pytest.raises(ProviderFailure) as error:
        provider_call(lambda r:httpx.Response(200,json=body))
    assert error.value.code=='provider_invalid_response'

def test_timeout_is_explicit():
    def handler(request):
        raise httpx.ReadTimeout('secret',request=request)
    with pytest.raises(ProviderFailure) as error:
        provider_call(handler)
    assert error.value.code=='provider_timeout' and error.value.status==504

def test_concurrency_limit():
    class SlowProvider:
        def __init__(self): self.started=asyncio.Event();self.release=asyncio.Event()
        async def reply(self,data):
            self.started.set();await self.release.wait();return 'Reply'
    async def run():
        provider=SlowProvider();app=create_app(Settings(api_key='test',model='model',max_concurrent=1),provider)
        async with app.router.lifespan_context(app):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://localhost') as c:
                first=asyncio.create_task(c.post('/api/chat',json=payload(mode='ai',consent=True),headers=HEADERS))
                await provider.started.wait()
                second=await c.post('/api/chat',json=payload(mode='ai',consent=True),headers=HEADERS)
                assert second.status_code==429 and second.json()['error']['code']=='busy'
                provider.release.set();assert (await first).status_code==200
    asyncio.run(run())


def test_static_asset_cache_and_compression(client):
    import hashlib
    import re
    home = client.get('/')
    path = re.search(r'(\/assets\/[^" ]+\?v=[0-9a-f]{12})', home.text).group(1)
    response = client.get(path, headers={'Accept-Encoding': 'gzip'})
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'public, max-age=31536000, immutable'
    assert response.headers['content-encoding'] == 'gzip'
    assert hashlib.sha256(response.content).hexdigest()[:12] == path.split('=')[-1]
    for unversioned in (path.split('?')[0], path.split('?')[0] + '?v=incorrect'):
        assert client.get(unversioned).headers['cache-control'] == 'public, max-age=0, must-revalidate'
    cached = client.get(path, headers={'If-None-Match': response.headers['etag']})
    assert cached.status_code == 304
    assert 'immutable' in cached.headers['cache-control']
    assert client.get('/assets/missing.js?v=incorrect').headers['cache-control'] == 'no-store'
    assert client.get('/api/health').headers['cache-control'] == 'no-store'
