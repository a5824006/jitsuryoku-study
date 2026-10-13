import { test } from 'node:test';
import assert from 'node:assert/strict';
import { characterCount, emptyProgress, toggleSubject, validateProgress } from '../src/state.ts';
test('four-subject limit and replacement preserve study records', () => {
  let p = emptyProgress(); p.statuses.q = 'review';
  for (const id of ['a','b','c','d']) p = toggleSubject(p,id);
  assert.throws(()=>toggleSubject(p,'e'),/4科目/);
  p=toggleSubject(toggleSubject(p,'b'),'e');
  assert.deepEqual(p.selected,['a','c','d','e']); assert.equal(p.statuses.q,'review');
});
test('backup round-trip preserves selections, notes and statuses', () => {
  const p={...emptyProgress(),selected:['a'],statuses:{q:'understood' as const},favorites:['q'],drafts:{q:'再確認\n行列の順序'}};
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p)),new Set(['a']),new Set(['q'])),p);
});
test('invalid backups are rejected without mutating current records', () => {
  const p=emptyProgress(); const before=JSON.stringify(p);
  for(const bad of [{...p,version:2},{...p,selected:['a','a']},{...p,statuses:{q:'correct'}},{...p,favorites:['unknown']},{...p,drafts:{q:12}}]) assert.throws(()=>validateProgress(bad,new Set(['a']),new Set(['q'])));
  assert.equal(JSON.stringify(p),before);
});
test('Japanese character count uses code points and ignores whitespace',()=>{assert.equal(characterCount('固有値\n A \t😀'),5);});
