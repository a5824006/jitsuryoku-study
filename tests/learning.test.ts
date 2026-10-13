import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gradeQuiz} from '../src/grading.ts';
import {crcSteps,dijkstraSteps,transformPoint} from '../src/visual-algorithms.ts';
import {recommend} from '../src/recommendations.ts';
import {emptyProgress} from '../src/state.ts';
import type {Catalog,Quiz} from '../src/types.ts';
const quiz=(values:Partial<Quiz>):Quiz=>({id:'q',kind:'text',prompt:'test',explanation:'reason',pitfall:'note',...values});
test('multiple selections require exact set, independently of order',()=>{
  const q=quiz({kind:'multiple-choice',correctOptions:['b','c']});
  assert.equal(gradeQuiz(q,['c','b']),true);for(const v of [['b'],['a','b','c'],['b','b'],[]])assert.equal(gradeQuiz(q,v),false);
});
test('term aliases normalize width, case and whitespace only',()=>{
  const q=quiz({acceptedAnswers:['TCP','トランスポート層']});
  assert.equal(gradeQuiz(q,' ｔｃｐ '),true);assert.equal(gradeQuiz(q,'TCPは通信'),false);
});
test('numbers respect tolerance and reject expressions and empty values',()=>{
  const q=quiz({kind:'number',numericAnswer:3,tolerance:.01});
  assert.equal(gradeQuiz(q,'3.009'),true);assert.equal(gradeQuiz(q,'3.011'),false);
  for(const a of ['', 'NaN','Infinity','1+2','0x3','3V'])assert.equal(gradeQuiz(q,a),false);
});
test('bit answers preserve leading zeros and reject other characters',()=>{
  const q=quiz({kind:'bits',acceptedAnswers:['011']});assert.equal(gradeQuiz(q,'011'),true);assert.equal(gradeQuiz(q,'11'),false);assert.equal(gradeQuiz(q,'0 11'),false);
});
test('CRC agrees with independent polynomial BigInt division',()=>{
  const divide=(bits:string,g:string)=>{let n=BigInt('0b'+bits),d=BigInt('0b'+g);while(n&&n.toString(2).length>=g.length)n^=d<<BigInt(n.toString(2).length-g.length);return n.toString(2).padStart(g.length-1,'0');};
  for(const d of ['10101111','11111111','0','1','100100']){const r=crcSteps(d,'1011');assert.equal(r.remainder,divide(d+'000','1011'));assert.equal(divide(r.codeword,'1011'),'000');}
  assert.equal(crcSteps('10101111','1011').remainder,'110');assert.equal(crcSteps('11111111','1011').remainder,'011');assert.throws(()=>crcSteps('2','1011'));
});
test('coordinate transform uses rotation then translation',()=>{
  const out=transformPoint(2,1,90,1,0);assert.ok(Math.abs(out.rotated.x+1)<1e-12);assert.ok(Math.abs(out.transformed.x)<1e-12);assert.ok(Math.abs(out.transformed.y-2)<1e-12);
});
test('Dijkstra matches all-pairs relaxation on a graph with ties',()=>{
  const nodes=['A','B','C','D'],edges=[{from:'A',to:'B',weight:2},{from:'A',to:'C',weight:2},{from:'B',to:'C',weight:0},{from:'C',to:'D',weight:3}];
  const result=dijkstraSteps(nodes,edges,'A').at(-1)!;
  const d=Object.fromEntries(nodes.map(n=>[n,n==='A'?0:Infinity]));
  for(let i=0;i<nodes.length;i++)for(const e of edges){d[e.to]=Math.min(d[e.to],d[e.from]+e.weight);d[e.from]=Math.min(d[e.from],d[e.to]+e.weight);}
  assert.deepEqual(result.distances,d);assert.deepEqual(result.settled,['A','B','C','D']);assert.throws(()=>dijkstraSteps(nodes,[{from:'A',to:'B',weight:-1}],'A'));
});
test('recommendations prioritize weak foundations then review then untouched',()=>{
  const t={id:'a-t',name:'基礎',prerequisite:true,appearanceYears:2,availableYears:2,years:[2024,2025]};
  const c={subjects:[{subjectId:'a',availableYears:[2024,2025],topics:[t]}],questions:[{id:'a-q',subjectId:'a',topics:[t.id],year:2025,title:'問題'}]} as unknown as Catalog;
  const p={...emptyProgress(),selected:['a']};assert.equal(recommend(c,p)[0].href,'#/practice/a-q');p.statuses['a-q']='review';assert.match(recommend(c,p)[0].reason,/復習/);
  p.quizAttempts['a-t-c1']={answer:'bad',correct:false,attemptedAt:'2026-10-14T00:00:00Z'};assert.equal(recommend(c,p)[0].href,'#/learn/a-t');p.quizAttempts['a-t-c1'].correct=true;assert.equal(recommend(c,p)[0].href,'#/practice/a-q');
});
