import pytest
from backend.limits import SlidingWindowLimiter, client_key

def test_clients_are_limited_independently():
    lim=SlidingWindowLimiter(2)
    assert lim.hit('a',0)==0 and lim.hit('a',1)==0
    assert lim.hit('a',2)>0          # a is blocked...
    assert lim.hit('b',2)==0         # ...b is not

def test_window_expires_and_reports_retry_after():
    lim=SlidingWindowLimiter(1,window=60)
    assert lim.hit('a',0)==0
    assert 1<=lim.hit('a',10)<=60
    assert lim.hit('a',61)==0

def test_memory_is_bounded():
    lim=SlidingWindowLimiter(5,window=60,max_keys=100)
    for i in range(1000): lim.hit(f'k{i}',float(i)*0.01)
    assert len(lim._hits)<=100

class R:
    def __init__(self,xff='',host='9.9.9.9'):
        self.headers={'x-forwarded-for':xff} if xff else {}
        self.client=type('C',(),{'host':host})()

def test_forwarded_header_ignored_unless_proxy_configured():
    assert client_key(R('1.1.1.1, 2.2.2.2'),0)=='9.9.9.9'
    assert client_key(R('1.1.1.1, 2.2.2.2'),1)=='2.2.2.2'
    assert client_key(R('1.1.1.1, 2.2.2.2'),2)=='1.1.1.1'
    assert client_key(R('3.3.3.3'),2)=='9.9.9.9'   # too few hops: fall back, never trust a spoofed value

def test_one_client_cannot_lock_out_another_on_login():
    from fastapi.testclient import TestClient
    from backend.app import create_app, Settings
    app=create_app(Settings(auth_limit=3))
    h={'X-MindBridge-Client':'v5','Content-Type':'application/json'}
    with TestClient(app,base_url='http://localhost') as c:
        for _ in range(3): c.post('/api/auth/login',json={'username':'nobody','password':'x'*12},headers=h)
        assert c.post('/api/auth/login',json={'username':'nobody','password':'x'*12},headers=h).status_code==429
        # a different client address is unaffected
        c2=TestClient(app,base_url='http://localhost',client=('8.8.8.8',5000))
        assert c2.post('/api/auth/login',json={'username':'nobody','password':'x'*12},headers=h).status_code==401
