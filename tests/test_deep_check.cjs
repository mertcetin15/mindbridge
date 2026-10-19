const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');const ctx={document:{getElementById:()=>null}};ctx.window=ctx;vm.runInNewContext(fs.readFileSync('frontend/deep-check.js','utf8'),ctx);const summary=ctx.mbDeepSummary;
assert(summary(Array(27).fill(null)).every(x=>x.mean===null));
const a=Array(27).fill(null);a[0]=3;assert.equal(summary(a)[0].mean,null);a[1]=1;assert.equal(summary(a)[0].mean,2);assert.equal(summary(a)[0].count,2);
a[24]=3;a[25]=3;a[26]=3;assert.equal(summary(a)[7].mean,null);
a[2]=0;assert.equal(summary(a)[0].mean,4/3);
const zeros=summary(Array(27).fill(0));assert(zeros.every(x=>x.mean===0&&x.count===3));
assert(summary(Array(27).fill(99)).every(x=>x.mean===null));
console.log('PASS detailed reflection excludes skips, requires coverage, separates context and rejects invalid responses');
