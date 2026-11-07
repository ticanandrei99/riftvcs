const assert=require('node:assert/strict');
const merge=require('deepmerge');
const resolved=require.resolve('deepmerge');
const malicious=JSON.parse('{"__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}},"nested":{"__proto__":{"isAdmin":true}}}');
for(const [target,source] of [[malicious,{}],[{},malicious],[Object.create(null),malicious],[malicious,malicious]]){
  const result=merge(target,source);
  assert.equal(Object.getPrototypeOf(result),Object.prototype);
  assert.equal(result.isAdmin,undefined);
  assert.equal(Object.hasOwn(result,'__proto__'),false);
  assert.equal(Object.hasOwn(result,'constructor'),false);
  if(result.nested){assert.equal(Object.getPrototypeOf(result.nested),Object.prototype);assert.equal(result.nested.isAdmin,undefined);}
}
assert.equal({}.isAdmin,undefined);
assert.deepEqual(merge({test:{list:['one'],enabled:false}},{test:{list:['two'],enabled:true}}),{test:{list:['one','two'],enabled:true}});
assert.deepEqual(merge.all([{a:1},{b:2}]),{a:1,b:2});
const symbol=Symbol('fixture');assert.equal(merge({[symbol]:7},{} )[symbol],7);
assert.deepEqual(merge({a:[1]},{a:[2]},{arrayMerge:(_a,b)=>b}),{a:[2]});
assert.deepEqual(merge({a:1},{a:{b:2}},{customMerge:key=>key==='a'?()=>({custom:true}):undefined}),{a:{custom:true}});
assert.match(require('deepmerge/package.json').version,/riftvoice/);
console.log('Patched deepmerge: prototype-poisoning regression and normal configuration merging passed.');
