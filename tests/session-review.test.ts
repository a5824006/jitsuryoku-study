import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewAnswer } from '../src/session-review.ts';
import type { Question, Solution } from '../src/types.ts';

const question = { minimumCharacters: null, keywords: [] } as unknown as Question;
const solution = { status: 'verified', checklist: ['途中式', '単位'], autoCheck: {
  kind: 'multiple-choice', correctOptions: ['a', 'c'],
} } as unknown as Solution;

test('session results distinguish unanswered, incorrect and correct multiple selections', () => {
  for (const draft of ['', '[]', 'broken json']) {
    const review = reviewAnswer(question, solution, draft, []);
    assert.equal(review.answered, false);
    assert.equal(review.automatic, null);
  }
  assert.equal(reviewAnswer(question, solution, '["a"]', []).automatic, false);
  assert.equal(reviewAnswer(question, solution, '["c","a"]', []).automatic, true);
});

test('conditional solutions and essays remain self-assessed', () => {
  assert.equal(reviewAnswer(question, { ...solution, status: 'conditional' }, '["a","c"]', []).automatic, null);
  const essay = { ...solution, autoCheck: undefined };
  assert.equal(reviewAnswer(question, essay, '答案', []).answered, true);
  assert.equal(reviewAnswer(question, essay, '答案', []).automatic, null);
  assert.equal(reviewAnswer(question, essay, ' \n ', []).answered, false);
});

test('session review reports length, specified terms and only unchecked elements', () => {
  const q = { ...question, minimumCharacters: 6, keywords: ['平衡木', '計算量'] };
  const s = { ...solution, autoCheck: undefined };
  const review = reviewAnswer(q, s, '平衡木\nです', [0, 0, 99]);
  assert.deepEqual(review.missingRequirements, ['文字数：5 / 6字以上', '指定語句：計算量']);
  assert.deepEqual(review.unchecked, ['単位']);
  assert.deepEqual(reviewAnswer(q, s, '平衡木と計算量', [0, 1]).missingRequirements, []);
  assert.deepEqual(reviewAnswer(q, s, '平衡木と計算量', [0, 1]).unchecked, []);
});
