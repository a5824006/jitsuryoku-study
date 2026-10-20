import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyProgress,validateProgress} from '../src/state.ts';
import {exerciseSummary,needsReview} from '../src/learning-state.ts';
import {gradeQuiz} from '../src/grading.ts';
import {recommend} from '../src/recommendations.ts';
import type {Catalog,LearningSubject,Exercise,Subject,Question} from '../src/types.ts';
import {validateLearning} from '../scripts/validate-learning.mjs';
const analysis=JSON.parse(readFileSync('data/analysis/aggregate.json','utf8'));
const sources=analysis.subjects.map((s:{subjectId:string})=>JSON.parse(readFileSync('data/analysis/subjects/'+s.subjectId+'.json','utf8')));
const subjects:Subject[]=analysis.subjects.map((s:{subjectId:string},i:number)=>({...s,prerequisites:sources[i].prerequisites,answerTraits:sources[i].answerTraits,preparation:sources[i].preparation,overlaps:sources[i].overlaps,topics:analysis.topics.filter((t:{subjectId:string})=>t.subjectId===s.subjectId)}));
const questions:Question[]=sources.flatMap((s:{subjectId:string;papers:{year:number;sourceFile:string;answerLanguage:string;questions:Question[]}[]})=>s.papers.flatMap(p=>p.questions.map(q=>({...q,subjectId:s.subjectId,year:p.year,sourceFile:p.sourceFile,answerLanguage:p.answerLanguage}))));
const generated=await validateLearning(process.cwd(),subjects,questions);
const catalog:Catalog={schemaVersion:2,analyzedAt:analysis.analyzedAt,subjects,questions,learningIndex:generated.learningIndex,quizIds:generated.quizIds,selfCheckIds:generated.selfCheckIds,foundations:generated.foundations.foundations.map((f:{id:string;title:string})=>({...f,topicIds:generated.all.flatMap((s:LearningSubject)=>s.lessons.filter(l=>l.prerequisiteFoundationIds.includes(f.id)).map(l=>l.topicId))}))};

test('all themes, foundations, intensive lessons and exercise references are complete',async()=>{
 const result=await validateLearning(process.cwd(),catalog.subjects,catalog.questions);
 assert.equal(result.counts.lessons,69);assert.equal(result.counts.foundations,8);assert.equal(result.counts.intensive,26);
 assert.equal(result.learningIndex.length,584);assert.equal(new Set(result.learningIndex.map(i=>i.id)).size,584);
 assert.equal(result.counts.selfChecks,231);
 const original=JSON.parse(readFileSync('data/analysis/aggregate.json','utf8'));
 assert.equal(original.topics.length,69);assert.equal(original.questions.length,199);
 for(const f of result.foundations.foundations)for(const q of f.quizzes.filter((q:Exercise)=>q.kind!=='self-check'))assert.equal(gradeQuiz(q,String(q.numericAnswer)),true);
});

test('v2 migration preserves previous answers and does not fabricate notes or diagnostics',()=>{
 const old={version:2,selected:['networks'],statuses:{'networks-2025-q8':'review'},favorites:[],drafts:{'networks-2025-q8':'011'},quizAttempts:{'networks-crc-c1':{answer:'101',correct:false,attemptedAt:'2026-10-14T00:00:00Z'}},checks:{},durations:{'networks-2025-q8':6}};
 const before=JSON.stringify(old),ids=new Set(['networks-2025-q8']);
 const migrated=validateProgress(old,new Set(['networks']),ids,new Set(['networks-crc-c1','networks-crc-diagnostic']),new Set());
 assert.equal(migrated.version,3);assert.equal(migrated.drafts['networks-2025-q8'],'011');assert.deepEqual(migrated.notes,{});assert.deepEqual(migrated.selfAssessments,{});
 assert.equal(migrated.quizAttempts['networks-crc-diagnostic'],undefined);assert.equal(JSON.stringify(old),before);
});

test('v3 backups round-trip notes, answers and self assessments separately and reject invalid records',()=>{
 const p={...emptyProgress(),drafts:{q:'011'},notes:{q:'先頭の0を残す'},selfAssessments:{s:{answer:'紙で図示',checks:[0],result:'review' as const,attemptedAt:'2026-10-14T00:00:00Z'}}};
 assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p)),new Set(),new Set(['q']),new Set(),new Set(['s'])),p);
 for(const bad of [{...p,notes:{bad:'unknown'}},{...p,selfAssessments:{bad:p.selfAssessments.s}},{...p,selfAssessments:{s:{...p.selfAssessments.s,checks:[-1]}}},{...p,selfAssessments:{s:{...p.selfAssessments.s,result:'correct'}}}])assert.throws(()=>validateProgress(bad,new Set(),new Set(['q']),new Set(),new Set(['s'])));
});

test('review uses latest results, distinguishes self assessment and preserves separate variants',()=>{
 const q={id:'check',kind:'number'} as Exercise,s={id:'self',kind:'self-check'} as Exercise;
 const p=emptyProgress();p.quizAttempts.check={answer:'1',correct:false,attemptedAt:'2026-10-14T00:00:00Z'};
 p.quizAttempts.variant={answer:'2',correct:true,attemptedAt:'2026-10-14T00:00:01Z'};
 p.selfAssessments.self={answer:'',checks:[],result:'review',attemptedAt:'2026-10-14T00:00:01Z'};
 assert.equal(needsReview(q,p),true);assert.equal(needsReview(s,p),true);
 p.quizAttempts.check.correct=true;p.selfAssessments.self.result='understood';
 assert.equal(needsReview(q,p),false);assert.equal(needsReview(s,p),false);
 assert.deepEqual(exerciseSummary([q,s],p),{correct:1,automatic:1,selfConfirmed:1,manual:1,review:0,unattempted:0});
});

test('diagnostics and other failed exercises precede past exam review without inferring role from IDs',()=>{
 const p={...emptyProgress(),selected:['networks']};p.statuses[catalog.questions.find(q=>q.subjectId==='networks')!.id]='review';
 const diagnostic=catalog.learningIndex.find(i=>i.subjectId==='networks'&&i.role==='diagnostic')!;
 const check=catalog.learningIndex.find(i=>i.subjectId==='networks'&&i.role==='check'&&i.kind!=='self-check')!;
 p.quizAttempts[check.id]={answer:'bad',correct:false,attemptedAt:'2026-10-14T00:00:00Z'};
 assert.match(recommend(catalog,p)[0].href,/tab=foundations/);
 p.quizAttempts[diagnostic.id]={answer:'bad',correct:false,attemptedAt:'2026-10-14T00:00:00Z'};
 assert.match(recommend(catalog,p)[0].reason,/診断/);
 const altered={...catalog,learningIndex:catalog.learningIndex.map(i=>i.id===diagnostic.id?{...i,id:'no-naming-convention'}:i)};
 p.quizAttempts['no-naming-convention']=p.quizAttempts[diagnostic.id];delete p.quizAttempts[diagnostic.id];
 assert.match(recommend(altered,p)[0].href,/no-naming-convention/);
});

test('shared prerequisite errors are offered once and open the foundation review filter',()=>{
 const p={...emptyProgress(),selected:['mathematical-modeling','robotics']};
 const item=catalog.learningIndex.find(i=>i.topicId==='foundation-matrix'&&i.kind!=='self-check')!;
 p.quizAttempts[item.id]={answer:'bad',correct:false,attemptedAt:'2026-10-14T00:00:00Z'};
 const next=recommend(catalog,p);
 assert.match(next[0].reason,/共通基礎/);assert.match(next[0].href,/subject=foundations/);
 assert.notEqual(next[1].href,next[0].href);
});

test('independent calculations validate new worked examples and numerical diagnoses',()=>{
 const course=(id:string)=>JSON.parse(readFileSync('data/learning/'+id+'.json','utf8')) as LearningSubject;
 const diagonal=course('mathematical-modeling').lessons.find(l=>l.topicId==='mathematical-modeling-inverse-matrix')!;
 assert.equal(gradeQuiz(diagonal.diagnostic,String(1/5)),true);
 const hci=course('hci').lessons.find(l=>l.topicId==='hci-fitts')!;
 assert.equal(gradeQuiz(hci.diagnostic,String(2*6)),true);
 // Inverse matrix and eigenvector checks use direct multiplication, not the content's solution steps.
 const A=[[1,1],[1,2]],B=[[2,-1],[-1,1]];
 const multiply=(a:number[][],b:number[][])=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*b[k][j],0)));
 assert.deepEqual(multiply(A,B),[[1,0],[0,1]]);assert.deepEqual(multiply(B,A),[[1,0],[0,1]]);
 assert.deepEqual(multiply([[3,1],[0,4]],[[1],[1]]),[[4],[4]]);
 const crc=(bits:string,g:string)=>{let n=BigInt('0b'+bits),d=BigInt('0b'+g);while(n&&n.toString(2).length>=g.length)n^=d<<BigInt(n.toString(2).length-g.length);return n.toString(2).padStart(g.length-1,'0');};
 assert.equal(crc('101000','1011'),'100');assert.equal(crc('110000','1011'),'001');assert.equal(crc('110001','1011'),'000');
 const alpha=Math.PI/3,theta=-2*Math.PI/3;
 assert.ok(Math.abs(Math.cos(alpha)+Math.cos(alpha+theta)-1)<1e-12);
 assert.ok(Math.abs(Math.sin(alpha)+Math.sin(alpha+theta))<1e-12);
 const huffman=course('information-mathematics').lessons.find(l=>l.topicId==='information-mathematics-huffman')!;
 assert.ok(Math.abs(.4*1+.3*2+.2*3+.1*3-1.9)<1e-12);assert.match(huffman.examples[1].answer,/1\.9bit/);
 const graph=course('information-mathematics').lessons.find(l=>l.topicId==='information-mathematics-graph')!;
 const pairings=[2+9,5+5,6+6];assert.match((graph.quizzes[4] as {answer:string}).answer,new RegExp('最小はACとBDの'+Math.min(...pairings)));
 const fluid=course('digital-media').lessons.find(l=>l.topicId==='digital-media-fluid-methods')!;
 assert.match((fluid.quizzes[4] as {answer:string}).answer,new RegExp('='+String(1+3*4)));
 const energy=course('multimedia').lessons.find(l=>l.topicId==='multimedia-energy')!;
 assert.match((energy.retests[1] as {answer:string}).answer,new RegExp('二乗和は'+String(1**2+(2*.5)**2)));
});
