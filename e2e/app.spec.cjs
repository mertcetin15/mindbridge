const {test,expect}=require('@playwright/test');
async function open(page){
 await page.goto('/');await expect(page.locator('#preloader')).toBeHidden({timeout:15000});
 await expect(page.locator('#mb-account-status')).not.toHaveText('Please wait…');
}
async function tools(page,key='session'){
 const menu=page.locator('#hamburger-btn');if(await menu.isVisible())await menu.click();
 await page.locator('.nav-link[data-page="tools"]').click();
 await expect(page.locator('#page-tools')).toHaveClass(/active/);
 await page.locator('#mb-tab-'+key).click();
}
test('loads without JS errors, translates and fits viewport',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await tools(page);
 await expect(page.locator('#mb-focus-plan')).toBeVisible();
 await page.locator('#lang-btn').click();await page.locator('[data-lang="tr"]').click();
 await expect(page.locator('#mb-focus-start')).toHaveText('Bu oturumu başlat');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});
test('account journal persists after reload and logout hides it',async({page})=>{
 await open(page);await page.locator('#mb-account-arrival').scrollIntoViewIfNeeded();
 await expect(page.locator('#mb-register')).toBeEnabled();
 await page.locator('#mb-account-username').fill('e2e_'+Date.now()+'_'+Math.floor(Math.random()*999));
 await page.locator('#mb-account-password').fill('test-password-long-enough');
 await page.locator('#mb-register').click();await expect(page.locator('#mb-logout')).toBeVisible();
 await tools(page);const note='Browser test note <b>plain text</b>';
 await page.locator('#mb-tab-write').click();await page.locator('#journal-input').fill(note);await page.locator('button[data-mb-click="saveJournal()"]').click();
 await page.locator('#mb-tab-write').click();await expect(page.locator('#mb-list-journal')).toContainText(note);
 await page.reload();await expect(page.locator('#preloader')).toBeHidden({timeout:15000});await tools(page);
 await page.locator('#mb-tab-write').click();await expect(page.locator('#mb-list-journal')).toContainText(note);
 await page.evaluate(()=>handleNavClick('home'));await page.locator('#mb-account-arrival').scrollIntoViewIfNeeded();await page.locator('#mb-logout').click();await expect(page.locator('#mb-account-form')).toBeVisible();await tools(page);
 await expect(page.locator('#mb-list-journal')).not.toContainText(note);
});
test('goal completion creates a draft only',async({page})=>{
 await open(page);await tools(page);await expect(page.locator('#mb-register')).toBeEnabled();
 await page.clock.install();
 await page.locator('#mb-focus-goal').fill('Finish introduction');await page.locator('#mb-focus-step').fill('Write one sentence');await page.locator('#mb-focus-minutes').fill('1');
 await page.locator('#mb-focus-start').click();await page.clock.fastForward(61000);
 await expect(page.locator('#mb-focus-review')).toBeVisible();await expect(page.locator('#mb-focus-transfer')).toBeDisabled();
 await page.locator('#mb-focus-partial').click();await page.locator('#mb-focus-transfer').click();
 await expect(page.locator('#journal-input')).toHaveValue(/Finish introduction/);
 await expect(page.locator('#mb-list-journal')).not.toContainText('Finish introduction');
});
test('keyboard skip link moves focus to main content',async({page})=>{
 await open(page);await page.keyboard.press('Tab');await expect(page.locator('.mb-skip')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.locator('#main-content')).toBeFocused();
});
test('daily planner persists a guest task and starts its focus block',async({page})=>{
 await open(page);await tools(page,'plan');await expect(page.locator('#mb-task-save')).toBeEnabled();
 await page.locator('#mb-task-task').fill('Prepare the lecturer email');
 await page.locator('#mb-task-step').fill('Write the greeting');
 await page.locator('#mb-task-minutes').fill('15');await page.locator('#mb-task-save').click();
 await expect(page.locator('#mb-planner-status')).toHaveText('Plan saved.');
 await page.reload();await expect(page.locator('#preloader')).toBeHidden({timeout:15000});await tools(page,'plan');
 await expect(page.locator('#mb-planner-suggestion')).toContainText('Prepare the lecturer email');
 await page.locator('#mb-planner-budget').fill('10');
 await page.locator('#mb-planner-suggestion button').click();
 await expect(page.locator('#mb-focus-goal')).toHaveValue('Prepare the lecturer email');
 await expect(page.locator('#timer-btn')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#timer-minutes')).toHaveValue('10');
});
test('tool search routes to a visible tool and restores keyboard focus',async({page})=>{
 await open(page);await page.locator('#mb-search-open').click();
 await expect(page.locator('#mb-search-input')).toBeFocused();
 await page.locator('#mb-search-input').fill('breathing');
 await page.locator('#mb-search-results button').first().click();
 await expect(page.locator('#mb-search')).not.toBeVisible();
 await expect(page.locator('#page-tools')).toBeVisible();
 await page.locator('#mb-search-open').click();await page.keyboard.press('Escape');
 await expect(page.locator('#mb-search-open')).toBeFocused();
});
test('rapid navigation and reduced motion keep the chosen page visible',async({page})=>{
 await open(page);
 await page.evaluate(()=>{handleNavClick('tools');handleNavClick('home');handleNavClick('library');});
 await expect(page.locator('#page-library')).toBeVisible();
 await expect(page.locator('#page-library')).toHaveCSS('opacity','1');
 await expect(page.locator('.page.active')).toHaveCount(1);
});
test('collapsed saved tools preserve forms and translated stories remain keyboard accessible',async({page})=>{
 await open(page);await tools(page,'plan');
 await page.locator('#mb-task-task').fill('Preserve this unfinished draft');
 await page.locator('#mb-tab-write').click();
 await expect(page.locator('#mb-task-task')).toHaveValue('Preserve this unfinished draft');
 await page.locator('#mb-tab-plan').click();
 await expect(page.locator('#mb-task-task')).toBeVisible();
 await page.locator('#lang-btn').click();await page.locator('[data-lang="tr"]').click();
 await page.evaluate(()=>handleNavClick('stories'));
 await expect(page.locator('.story-item').first()).toHaveAttribute('role','button');
 await expect(page.locator('.story-item').first()).toHaveAttribute('tabindex','0');
});
test('self-check retains answers across language changes and clears on restart',async({page})=>{
 await open(page);await page.evaluate(()=>handleNavClick('quiz'));
 await expect(page.locator('#btn-next')).toBeDisabled();
 await page.locator('#q-opts button').nth(2).click();await page.locator('#btn-next').click();
 await page.locator('#lang-btn').click();await page.locator('[data-lang="tr"]').click();
 await expect(page.locator('#q-counter')).toContainText('02 / 05');
 await page.locator('#mb-check-back').click();await expect(page.locator('#q-opts button').nth(2)).toHaveAttribute('aria-pressed','true');
 await page.locator('#btn-next').click();for(let i=0;i<4;i++)await page.locator('#mb-check-skip').click();
 await expect(page.locator('#mb-check-result-title')).toBeFocused();
 await page.getByRole('button',{name:'Yanıtları temizle ve yeniden başla',exact:true}).click();
 await expect(page.locator('#btn-next')).toBeDisabled();await expect(page.locator('#quiz-result')).toBeEmpty();
});
test('campus home honours reduced motion and links to the real journal',async({page})=>{
 await open(page);
 await expect(page.locator('#mb-cinema')).toBeVisible();
 await expect(page.locator('#mb-cinema')).toHaveClass(/mb-cinema-static/);
 await expect(page.locator('#mb-campus-motion')).toBeDisabled();
 await expect(page.locator('#page-home')).toHaveClass(/mb-motion-off/);
 await tools(page);await page.locator('#mb-tab-write').click();await page.locator('#journal-input').focus();
 await expect(page.locator('#page-tools')).toBeVisible();
 await expect(page.locator('#journal-input')).toBeFocused();
});
test('minimal home and workspace expose only the essential controls',async({page},testInfo)=>{
 await open(page);await expect(page.locator('#mb-campus-desk')).not.toBeVisible();await expect(page.locator('.mb-journey-ruler,.mb-paper-fold,.mb-branch-divider')).toHaveCount(0);
 await page.evaluate(()=>window.mbOpenWorkspace());const w=page.locator('#mb-workspace');await expect(w.locator('.mb-w-nav>button')).toHaveCount(3);await expect(w.locator('#mb-w-task-title')).toBeVisible();await expect(w.locator('#mb-w-task-project')).not.toBeVisible();
 require('node:fs').mkdirSync('cinematic-qa',{recursive:true});await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-minimal-workspace.png'});
 await w.locator('.mb-w-advanced>summary').click();await expect(w.locator('#mb-w-task-project')).toBeVisible();
 await w.getByRole('button',{name:'Close',exact:true}).click();await expect(page.locator('.mb-quiet-section[open]')).toHaveCount(0);
});

test('field library filters, opens a worksheet and maintains the tab reading list',async({page})=>{
 await open(page);await page.evaluate(()=>handleNavClick('library'));
 await expect(page.locator('.mb-field-card')).toHaveCount(18);
 await page.locator('#mb-guide-search').fill('notifications');await expect(page.locator('.mb-field-card')).toHaveCount(1);
 await page.locator('.mb-field-card summary').click();await expect(page.locator('.mb-field-body ol li')).toHaveCount(3);
 await page.getByRole('button',{name:'Read later',exact:true}).click();await page.locator('#mb-guide-search').fill('');
 await page.getByRole('button',{name:'My reading list (1)',exact:true}).click();await expect(page.locator('.mb-field-card')).toHaveCount(1);
 await page.getByRole('button',{name:'Remove from list',exact:true}).click();await expect(page.locator('.mb-field-empty')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('Zen studio supports keyboard drawing, undo, redo and PNG export',async({page})=>{
 await open(page);await tools(page,'draw');const canvas=page.locator('#zen-canvas');await canvas.focus();
 await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Space');
 const studio=page.locator('#mb-zen-studio');await expect(studio.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
 await studio.getByRole('button',{name:'Undo',exact:true}).click();await expect(studio.getByRole('button',{name:'Download PNG',exact:true})).toBeDisabled();
 await studio.getByRole('button',{name:'Redo',exact:true}).click();
 const download=page.waitForEvent('download');await studio.getByRole('button',{name:'Download PNG',exact:true}).click();expect((await download).suggestedFilename()).toBe('mindbridge-zen.png');
 await studio.getByRole('button',{name:'Clear',exact:true}).click();await studio.getByRole('button',{name:'Undo',exact:true}).click();await expect(studio.getByRole('button',{name:'Download PNG',exact:true})).toBeEnabled();
});
test('detailed reflection reviews 27 answers, opens tools and clears on reload',async({page})=>{
 await open(page);await page.evaluate(()=>handleNavClick('quiz'));await page.locator('#mb-check-deep').click();
 const check=page.locator('#mb-deep-check');await expect(check).toBeVisible();
 for(let i=0;i<27;i++){await check.locator('.mb-deep-options button').nth(2).click();await check.locator('.mb-deep-actions .btn-solid').click();}
 await expect(check.locator('.mb-deep-map article')).toHaveCount(8);await expect(check.locator('.mb-deep-advice')).toHaveCount(3);
 await check.locator('.mb-deep-review>summary').click();await check.locator('.mb-deep-review button').first().click();await expect(check.locator('.mb-deep-options button').nth(2)).toHaveAttribute('aria-pressed','true');
 await page.reload();await expect(page.locator('#preloader')).toBeHidden();await page.evaluate(()=>handleNavClick('quiz'));await page.locator('#mb-check-deep').click();await expect(check.locator('.mb-deep-actions .btn-solid')).toBeDisabled();
});

test('sand brush paints, pauses on navigation and exports a real PNG',async({page})=>{
 await open(page);await tools(page,'draw');await page.locator('#mb-zen-brush').selectOption('sand');
 const canvas=page.locator('#zen-canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(180);await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.up();
 const studio=page.locator('#mb-zen-studio');await expect(studio.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
 const before=await canvas.evaluate(c=>c.toDataURL());await page.evaluate(()=>handleNavClick('home'));await page.evaluate(()=>handleNavClick('tools'));
 await expect(page.locator('#mb-zen-brush')).toHaveValue('sand');
 const download=page.waitForEvent('download');await studio.getByRole('button',{name:'Download PNG',exact:true}).click();expect((await download).suggestedFilename()).toBe('mindbridge-zen.png');
 expect(before.length).toBeGreaterThan(1000);
});
test('stories have real source links and fake community widgets are absent',async({page})=>{
 await open(page);await page.evaluate(()=>handleNavClick('stories'));await expect(page.locator('.story-item')).toHaveCount(10);
 await page.locator('.story-item').first().click();await expect(page.locator('.mb-story-source').first()).toBeVisible();await expect(page.locator('.mb-story-source').first()).toHaveAttribute('href',/https:\/\/www.ucl.ac.uk/);
 await expect(page.locator('#live-studiers,#feedback-input,#plane-input')).toHaveCount(0);
 await page.evaluate(()=>handleNavClick('chat'));await expect(page.locator('#mb-chat-mode')).toHaveCount(0);
});

test('begin flow edits, shrinks, times and records a real attempt',async({page})=>{
 await open(page);await tools(page,'focus');const panel=page.locator('#mb-begin');
 await panel.getByLabel('What would you like to start?').fill('Prepare my portfolio');
 await panel.locator('.mb-begin-personalise>summary').click();await panel.getByLabel('Type of task').selectOption('4');
 await panel.getByRole('button',{name:'Make my first steps',exact:true}).click();
 await expect(panel.locator('.mb-begin-step')).toHaveCount(3);
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await panel.locator('#mb-begin-edit').fill('Open my portfolio README');await panel.getByRole('button',{name:'Save step',exact:true}).click();
 await expect(panel.locator('.mb-begin-current')).toHaveText('Open my portfolio README');
 await panel.getByRole('button',{name:'I’m stuck',exact:true}).click();await panel.getByRole('button',{name:'Make it smaller',exact:true}).click();await panel.getByRole('button',{name:'Use this step',exact:true}).click();
 await expect(panel.locator('.mb-begin-step')).toHaveCount(4);
 await panel.getByRole('button',{name:/^(Start this step|Resume)$/}).click();await expect(panel.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
 await page.evaluate(()=>handleNavClick('home'));await page.evaluate(()=>handleNavClick('tools'));await expect(panel.getByRole('button',{name:'Pause',exact:true})).toHaveCount(0);
 await panel.getByRole('button',{name:'Step done',exact:true}).click();await expect(panel.locator('.mb-begin-current')).toHaveText('Open my portfolio README');
 await panel.getByRole('button',{name:'End this attempt',exact:true}).click();await panel.getByLabel('Where should you pick up next time?').fill('Write the project overview');await panel.getByRole('button',{name:'Keep this reflection',exact:true}).click();
 await expect(panel.getByRole('button',{name:'Reflection recorded.',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.getItem('mindbridge.begin.v1'))).toBeNull();
 await panel.getByLabel('Remember on this browser').check();await page.reload();await tools(page,'focus');await expect(panel.getByLabel('Where should you pick up next time?')).toHaveValue('Write the project overview');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mb:account-changed')));await expect(panel.getByLabel('What would you like to start?')).toHaveValue('');
 expect(await page.evaluate(()=>localStorage.getItem('mindbridge.begin.v1'))).toBeNull();
});

test('begin supports all interface languages and opens from Self Check',async({page})=>{
 await open(page);await page.evaluate(()=>handleNavClick('quiz'));
 for(let i=0;i<5;i++){await page.locator('#q-opts button').nth(i===0?3:0).click();await page.locator('#btn-next').click();}
 await page.getByRole('button',{name:'Put tasks in your plan',exact:true}).click();await expect(page.locator('#mb-begin')).toBeVisible();
 for(const [lang,title] of [['tr','Birlikte başlayalım'],['de','Gemeinsam anfangen'],['es','Empecemos juntos']]){await page.locator('#lang-btn').click();await page.locator('[data-lang="'+lang+'"]').click();await expect(page.locator('#mb-begin-title')).toHaveText(title);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});

test('sand actually falls, settles on the floor, and undo restores empty paper',async({page})=>{
 await open(page);await tools(page,'draw');await page.locator('#mb-zen-brush').selectOption('sand');const canvas=page.locator('#zen-canvas');await canvas.focus();
 await canvas.scrollIntoViewIfNeeded();await page.keyboard.press('ArrowUp');await page.keyboard.press('Space');await expect(page.locator('#mb-zen-studio').getByRole('button',{name:'Download PNG',exact:true})).toBeEnabled();await page.waitForTimeout(220);await page.keyboard.press('Space');await canvas.blur();
 await expect.poll(()=>canvas.evaluate(c=>{const ctx=c.getContext('2d'),p=ctx.getImageData(Math.floor(c.width*.35),Math.floor(c.height*.96),Math.floor(c.width*.3),Math.max(1,Math.floor(c.height*.03))).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]<180&&p[i+2]>90)n++;return n;}),{timeout:10000}).toBeGreaterThan(5);
 const studio=page.locator('#mb-zen-studio');await studio.getByRole('button',{name:'Undo',exact:true}).click();await expect(studio.getByRole('button',{name:'Download PNG',exact:true})).toBeDisabled();await studio.getByRole('button',{name:'Redo',exact:true}).click();await expect(studio.getByRole('button',{name:'Download PNG',exact:true})).toBeEnabled();
});


test('cinematic story scrubs forward and backward without idle motion',async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
 const scene=page.locator('#mb-cinema'),canvas=page.locator('#mb-cinema-canvas');await expect(scene).not.toHaveClass(/mb-cinema-static/);
 await expect(canvas).toHaveAttribute('data-renderer',/webgl|canvas/);if(testInfo.project.name==='chromium')await expect(canvas).toHaveAttribute('data-renderer','webgl');await expect(canvas).toHaveAttribute('data-progress',/^0\./);
 const fs=require('node:fs');fs.mkdirSync('cinematic-qa',{recursive:true});
 async function scrub(p){await scene.evaluate((el,p)=>{const r=el.getBoundingClientRect(),start=scrollY+r.top-76;window.scrollTo(0,start+p*(r.height-innerHeight+76));},p);await expect.poll(async()=>Number(await canvas.getAttribute('data-progress'))).toBeCloseTo(p,2);await expect(scene.locator('.mb-cinema-panel,.mb-garden-chapters,.mb-garden-arrival,.mb-orbit-sculptures')).toHaveCount(0);await expect(scene.locator('.mb-journey-thought')).toBeVisible();}
 await scrub(.02);await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-knot.png'});
 await scrub(.46);await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-unravel.png'});const middle=Number(await canvas.getAttribute('data-morph'));
 await scrub(.86);await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-bridge.png'});expect(Number(await canvas.getAttribute('data-morph'))).toBeGreaterThan(middle);
 await scrub(.12);expect(Number(await canvas.getAttribute('data-morph'))).toBeLessThan(middle);
 const held=await canvas.getAttribute('data-progress');await page.waitForTimeout(150);expect(await canvas.getAttribute('data-progress')).toBe(held);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
 await scrub(.86);await page.locator('.mb-cinema-skip').click();await expect(page.locator('#mb-begin')).toBeVisible();
});

test('cinematic pause preserves the clean scene and skip opens the real workspace',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await open(page);const scene=page.locator('#mb-cinema');await page.locator('#mb-cinema-motion').click();await expect(scene).toHaveClass(/mb-cinema-static/);
 await expect(scene.locator('.mb-cinema-panel')).toHaveCount(0);
 await page.locator('.mb-cinema-skip').click();await expect(page.locator('#mb-begin')).toBeVisible();
});

test('garden destination and day-night transitions remain accessible',async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
 const scene=page.locator('#mb-cinema');await scene.evaluate(el=>{const r=el.getBoundingClientRect();window.scrollTo({top:scrollY+r.top-76+.98*(r.height-innerHeight+76),behavior:'instant'});});
 await expect(scene).toHaveAttribute('data-destination','garden');await expect(page.locator('#mb-garden-arrival')).toHaveCount(0);
 const fs=require('node:fs');fs.mkdirSync('cinematic-qa',{recursive:true});
 await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-garden-day.png'});
 await page.locator('#theme-toggle').click();await expect(scene).toHaveAttribute('data-night','1.000');
 await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-garden-night.png'});
 await page.locator('#theme-toggle').click();await page.waitForTimeout(100);await page.locator('#theme-toggle').click();await expect(scene).toHaveAttribute('data-night','1.000');
 await page.locator('.mb-cinema-skip').click();await expect(page.locator('#mb-begin')).toBeVisible();
 expect(errors).toEqual([]);
});

test('workspace dependencies, task search and scheduling work together',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await page.evaluate(()=>window.mbOpenWorkspace());const w=page.locator('#mb-workspace');await expect(w).toBeVisible();
 await w.locator('#mb-w-task-title').fill('First task');await w.locator('form[data-form="task"]').getByRole('button',{name:'Add',exact:true}).click();
 await expect(w.locator('.mb-w-task')).toHaveCount(1);await w.locator('.mb-w-task-search').fill('missing');await expect(w.locator('.mb-w-task')).not.toBeVisible();await w.locator('.mb-w-task-search').fill('First');await expect(w.locator('.mb-w-task')).toBeVisible();await w.locator('.mb-w-task-search').fill('');await w.locator('#mb-w-task-title').fill('Dependent task');await w.locator('.mb-w-advanced>summary').click();await w.locator('#mb-w-task-depends').selectOption({label:'First task'});await w.locator('form[data-form="task"]').getByRole('button',{name:'Add',exact:true}).click();
 require('node:fs').mkdirSync('cinematic-qa',{recursive:true});await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-workspace-projects.png'});const dependent=w.locator('.mb-w-task').filter({hasText:'Dependent task'});await dependent.locator('select').selectOption('done');await expect(w.locator('.mb-w-status')).toHaveText('Finish the prerequisites first.');
 await w.locator('.mb-w-task').filter({hasText:'First task'}).locator('select').selectOption('done');await dependent.locator('select').selectOption('done');
 await w.locator('[data-section="week"]').click();await w.locator('form[data-form="block"]').getByRole('button',{name:'Schedule',exact:true}).click();await expect(w.locator('.mb-w-block')).toHaveCount(1);await w.locator('form[data-form="block"]').getByRole('button',{name:'Schedule',exact:true}).click();await expect(w.locator('.mb-w-status')).toContainText('overlaps');
 expect(errors).toEqual([]);
});

test('workspace backup preview does not replace data until confirmed and account change clears it',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await page.evaluate(()=>window.mbOpenWorkspace());const w=page.locator('#mb-workspace');await w.locator('#mb-w-task-title').fill('Keep me');await w.locator('form').getByRole('button',{name:'Add',exact:true}).click();
 await workspaceSection(w,'data');const backup={version:1,tasks:[],blocks:[],routines:[],distractions:[],decisions:[],reviews:[]};await w.locator('#mb-w-backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(w.locator('.mb-w-preview')).toBeVisible();await w.locator('[data-section="projects"]').click();await expect(w.locator('.mb-w-task')).toHaveCount(1);await workspaceSection(w,'data');await w.getByRole('button',{name:'Replace workspace with previewed backup',exact:true}).click();await w.locator('[data-section="projects"]').click();await expect(w.locator('.mb-w-task')).toHaveCount(0);await w.getByRole('button',{name:'Undo last change',exact:true}).click();await expect(w.locator('.mb-w-task')).toHaveCount(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('mb:account-changed')));await expect(w).not.toBeVisible();await page.evaluate(()=>window.mbOpenWorkspace());await expect(w.locator('.mb-w-task')).toHaveCount(0);expect(errors).toEqual([]);
});

async function workspaceSection(w,key){if(key==='data'){await w.locator('.mb-w-retention').click();return;}const b=w.locator('[data-section=\"'+key+'\"]');if(!await b.isVisible())await w.locator('.mb-w-more>summary').click();await b.click();}


test('flat tool tabs show one workspace at a time',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await page.evaluate(()=>handleNavClick('tools'));
 await expect(page.locator('.mb-tool-workarea>.mb-primary-tool')).toHaveCount(8);await expect(page.locator('.mb-tool-directory>.mb-task-link')).toBeVisible();await expect(page.locator('#page-tools #mb-account-panel')).toHaveCount(0);await expect(page.locator('#page-home #mb-account-panel')).toHaveCount(1);
 await expect(page.locator('.mb-tools-archive')).toBeHidden();
 const focus=page.locator('.mb-primary-tool').nth(0);await expect(page.locator('#mb-tab-focus')).toHaveAttribute('aria-selected','true');
 await expect(page.locator('#mb-begin-task')).toBeVisible();await expect(page.locator('#mb-begin-category')).not.toBeVisible();await page.locator('#mb-tab-focus').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#mb-tab-write')).toBeFocused();await expect(focus).toBeHidden();await page.keyboard.press('End');await expect(page.locator('#mb-pane-records')).toBeVisible();await page.keyboard.press('Home');await expect(focus).toBeVisible();
 await focus.locator('.mb-begin-personalise>summary').click();await expect(page.locator('#mb-begin-category')).toBeVisible();
 await page.locator('#mb-tab-write').click();await expect(focus).toBeHidden();await expect(page.locator('#journal-input')).toBeVisible();
 require('node:fs').mkdirSync('cinematic-qa',{recursive:true});await page.screenshot({path:'cinematic-qa/'+testInfo.project.name+'-simple-tools.png'});
 await page.locator('#lang-btn').click();await page.locator('[data-lang="tr"]').click();await expect(page.locator('#mb-tab-write')).toHaveText('Günlük');expect(errors).toEqual([]);
});

test('vine falls on activation without following the logo link',async({page})=>{await open(page);const vine=page.locator('.mb-vine-host>.mb-living-vine');await vine.focus();await page.keyboard.press('Enter');await expect(vine).toHaveAttribute('data-dropped','true');await expect(vine).toBeHidden();await expect(page.locator('#page-home')).toHaveClass(/active/);});
