import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {gradeQuiz} from '../src/grading.ts';
import type {LearningSubject,Quiz} from '../src/types.ts';
const courses=readdirSync('data/learning').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('data/learning/'+f,'utf8')) as LearningSubject);
test('all configured quiz answers are accepted by the shared grader',()=>{
  let n=0;
  for(const d of courses){const quizzes:Quiz[]=[...d.lessons.flatMap(l=>[...l.quizzes,l.retest]),...d.solutions.filter(s=>s.autoCheck).map(s=>s.autoCheck!)];
    for(const q of quizzes){const answers=q.kind==='number'?[String(q.numericAnswer)]:q.kind==='multiple-choice'?[q.correctOptions!]:q.kind==='choice'?[q.correctOptions![0]]:q.acceptedAnswers!;
      for(const answer of answers)assert.equal(gradeQuiz(q,answer),true,q.id+' configured answer');
      assert.equal(gradeQuiz(q,''),false,q.id+' blank');n++;
    }
  }
  assert.equal(n,297);
});
test('analysis IDs have complete unique learning coverage',()=>{
  const a=JSON.parse(readFileSync('data/analysis/aggregate.json','utf8'));
  assert.deepEqual(new Set(courses.flatMap(d=>d.solutions.map(s=>s.questionId))),new Set(a.questions.map((q:{id:string})=>q.id)));
  assert.deepEqual(new Set(courses.flatMap(d=>d.lessons.map(l=>l.topicId))),new Set(a.topics.map((t:{id:string})=>t.id)));
  assert.equal(courses.flatMap(d=>d.solutions).length,199);
  assert.equal(courses.flatMap(d=>d.lessons).length,69);
});
