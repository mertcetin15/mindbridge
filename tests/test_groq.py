import asyncio
import json
import httpx
import pytest
from backend.app import Settings, GroqProvider, ChatRequest, ProviderFailure, create_app

DATA=ChatRequest.model_validate({'mode':'ai','language':'tr','consent':True,'messages':[{'role':'user','content':'Hello'}]})

def call(handler):
    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await GroqProvider(client,Settings(api_key='FAKE_TEST_KEY',model='openai/gpt-oss-20b')).reply(DATA)
    return asyncio.run(run())

def test_groq_payload_and_response():
    def handler(request):
        assert str(request.url)=='https://api.groq.com/openai/v1/chat/completions'
        assert request.headers['Authorization']=='Bearer FAKE_TEST_KEY'
        body=json.loads(request.content)
        assert body['model']=='openai/gpt-oss-20b'
        assert body['max_completion_tokens']==2048
        assert body['reasoning_effort']=='low'
        assert body['messages'][0]['role']=='system'
        assert 'Respond in Turkish' in body['messages'][0]['content']
        assert body['messages'][1]['role']=='user'
        assert body['stream'] is False
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':' Merhaba! '}}]})
    assert call(handler)=='Merhaba!'

@pytest.mark.parametrize('status,code',[(401,'provider_auth_error'),(403,'provider_auth_error'),(429,'provider_rate_limit'),(500,'provider_unavailable')])
def test_errors_are_sanitized(status,code):
    with pytest.raises(ProviderFailure) as error:
        call(lambda r:httpx.Response(status,json={'error':'FAKE_PRIVATE_ERROR'}))
    assert error.value.code==code
    assert 'FAKE_PRIVATE_ERROR' not in str(error.value)

@pytest.mark.parametrize('body',[{}, {'choices':[]}, {'choices':[{'finish_reason':'length','message':{'role':'assistant','content':'Partial'}}]}, {'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':None}}]}, {'choices':[{'finish_reason':'stop','message':{'role':'user','content':'Wrong role'}}]}])
def test_invalid_output(body):
    with pytest.raises(ProviderFailure) as error: call(lambda r:httpx.Response(200,json=body))
    assert error.value.code=='provider_invalid_response'

def test_timeout():
    def handler(request): raise httpx.ReadTimeout('FAKE_SECRET',request=request)
    with pytest.raises(ProviderFailure) as error: call(handler)
    assert error.value.code=='provider_timeout'

def test_environment_uses_only_groq(monkeypatch):
    monkeypatch.setenv('OPENAI_API_KEY','IGNORED_OPENAI_TEST_KEY')
    monkeypatch.delenv('GROQ_API_KEY',raising=False)
    monkeypatch.delenv('GROQ_MODEL',raising=False)
    s=Settings.environment()
    assert s.api_key=='' and s.model=='openai/gpt-oss-20b'
    monkeypatch.setenv('GROQ_API_KEY','FAKE_GROQ_TEST_KEY')
    assert Settings.environment().api_key=='FAKE_GROQ_TEST_KEY'

def test_default_adapter_is_groq():
    async def run():
        app=create_app(Settings())
        async with app.router.lifespan_context(app): assert isinstance(app.state.provider,GroqProvider)
    asyncio.run(run())
