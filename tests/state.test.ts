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
  for(const bad of [{...p,version:3},{...p,selected:['a','a']},{...p,statuses:{q:'correct'}},{...p,favorites:['unknown']},{...p,drafts:{q:12}}]) assert.throws(()=>validateProgress(bad,new Set(['a']),new Set(['q'])));
  assert.equal(JSON.stringify(p),before);
});
test('Japanese character count uses code points and ignores whitespace',()=>{assert.equal(characterCount('固有値\n A \t😀'),5);});
test('v1 import migrates without modifying original data',()=>{
  const legacy={version:1,selected:['a'],statuses:{q:'review'},favorites:['q'],drafts:{q:'旧記録'}};
  const before=JSON.stringify(legacy);const migrated=validateProgress(legacy,new Set(['a']),new Set(['q']));
  assert.equal(migrated.version,2);assert.equal(migrated.drafts.q,'旧記録');assert.deepEqual(migrated.quizAttempts,{});assert.equal(JSON.stringify(legacy),before);
});
test('v2 validates quiz IDs, checklist indices and finite durations',()=>{
  const p={...emptyProgress(),quizAttempts:{c:{answer:'7',correct:true,attemptedAt:'2026-10-14T00:00:00Z'}},checks:{q:[0,2]},durations:{q:12.5}};
  assert.deepEqual(validateProgress(p,new Set(),new Set(['q']),new Set(['c'])),p);
  for(const bad of [{...p,durations:{q:NaN}},{...p,durations:{q:-1}},{...p,checks:{q:[-1]}},{...p,quizAttempts:{unknown:p.quizAttempts.c}}])assert.throws(()=>validateProgress(bad,new Set(),new Set(['q']),new Set(['c'])));
});
