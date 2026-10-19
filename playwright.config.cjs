const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,retries:process.env.CI?1:0,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:8000',trace:'retain-on-failure',screenshot:'only-on-failure',reducedMotion:'reduce'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},{name:'webkit',use:{...devices['Desktop Safari']}},{name:'mobile',use:{...devices['iPhone 13']}}],
 webServer:{command:'python3 build_frontend.py && python3 run.py',url:'http://127.0.0.1:8000/api/health',reuseExistingServer:false,env:{DATABASE_URL:'sqlite+pysqlite:///./data/e2e.sqlite3',GROQ_API_KEY:'',APP_ENV:'local',AI_REQUIRE_LOGIN:'0'},timeout:30000}
});
