'use strict';const assert=require('node:assert/strict'),C=require('../frontend/cinematic-core.js');let checks=0;function test(n,f){f();checks++;console.log('PASS '+n);}
test('camera clamps both ends and remains finite on compact screens',()=>{for(const compact of [false,true])for(const p of [-20,0,.2,.7,1,20]){const cam=C.camera(p,compact);assert(cam.eye.every(Number.isFinite));assert(cam.target.every(Number.isFinite));assert(C.lookAt(cam.eye,cam.target).every(Number.isFinite));assert(C.perspective(cam.fov,.4).every(Number.isFinite));}assert.deepEqual(C.camera(-2),C.camera(0));assert.deepEqual(C.camera(2),C.camera(1));});
test('the opened paths form a usable arch with a clear centre',()=>{for(let i=0;i<12;i++)for(let n=0;n<=100;n++){const p=C.path(i,n/100,true);assert.equal(p[0],(i-5.5)*.17);assert(p[1]>=-.26&&p[1]<=1.06);assert(p[2]>=-22&&p[2]<=8);}assert(C.path(0,.5,true)[1]>C.path(0,0,true)[1]);});
test('mobile geometry has fewer triangles with identical story endpoints',()=>{const small=C.geometry(true),full=C.geometry(false);assert(small.data.length<full.data.length);assert(full.data.length<3000000);assert.equal(full.data.length%16,0);assert(full.data.every(Number.isFinite));assert(small.data.every(Number.isFinite));assert.equal(full.lines.length,small.lines.length);});
test('projection rejects points behind the camera and places the target centrally',()=>{const cam=C.camera(0),screen=C.project(cam.target,cam,1200,800);assert(Math.abs(screen[0]-600)<.0001);assert(Math.abs(screen[1]-400)<.0001);assert.equal(C.project([cam.eye[0],cam.eye[1],cam.eye[2]+20],cam,1200,800),null);});
test('unravelling has a bounded monotonic transition without a time clock',()=>{let last=-1;for(let n=0;n<200;n++){const v=C.smooth(.06,.77,n/199);assert(v>=last&&v>=0&&v<=1);last=v;}assert.equal(C.smooth(.06,.77,0),0);assert.equal(C.smooth(.06,.77,1),1);});
console.log(checks+' cinematic geometry checks passed.');

require('./test_living_details.cjs');
require('./test_garden_world.cjs');

require('./test_workspace.cjs');
