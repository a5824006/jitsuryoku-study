import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
export async function validateLearning(root, subjects, questions) {
  const topicIds=new Set(subjects.flatMap(s=>s.topics.map(t=>t.id)));
  const quizIds=new Set(); const solutionIds=new Set(); const lessonIds=new Set();
  const check=(ok,message)=>{if(!ok)throw new Error(message);};
  const nonempty=x=>typeof x==='string'&&x.trim().length>0;
  const strings=x=>Array.isArray(x)&&x.length>0&&x.every(nonempty);
  const counts={lessons:0,solutions:0,quizzes:0,verified:0,conditional:0,pending:0,draft:0,autoChecks:0};
  const all=[];
  function quiz(q) {
    check(q&&nonempty(q.id)&&!quizIds.has(q.id),`重複/欠落したテストID: ${q?.id}`);quizIds.add(q.id);
    check(nonempty(q.prompt)&&nonempty(q.explanation)&&nonempty(q.pitfall),`テスト本文の欠落: ${q.id}`);
    check(['choice','multiple-choice','text','number','bits'].includes(q.kind),`テスト形式が不正: ${q.id}`);
    if(q.kind==='choice'||q.kind==='multiple-choice'){
      check(Array.isArray(q.options)&&q.options.length>=2&&q.options.every(o=>nonempty(o.id)&&nonempty(o.label)),`選択肢が不正: ${q.id}`);
      const options=new Set(q.options.map(o=>o.id));
      check(options.size===q.options.length&&strings(q.correctOptions)&&new Set(q.correctOptions).size===q.correctOptions.length&&q.correctOptions.every(id=>options.has(id)),`正答選択肢が不正: ${q.id}`);
      if(q.kind==='choice')check(q.correctOptions.length===1,`単一選択の正答数: ${q.id}`);
    }else if(q.kind==='number')check(Number.isFinite(q.numericAnswer)&&Number.isFinite(q.tolerance??0)&&(q.tolerance??0)>=0,`数値正答が不正: ${q.id}`);
    else check(strings(q.acceptedAnswers)&&(q.kind!=='bits'||q.acceptedAnswers.every(x=>/^[01]+$/.test(x))),`許容解が不正: ${q.id}`);
  }
  for(const subject of subjects){
    const filename=path.join(root,'data/learning',`${subject.subjectId}.json`);
    const data=JSON.parse(await readFile(filename,'utf8'));
    check(data.schemaVersion===1&&data.subjectId===subject.subjectId,`教材の科目が不正: ${filename}`);
    check(data.lessons.length===subject.topics.length,`基礎教材件数が不正: ${subject.subjectId}`);
    const ownTopics=new Set(subject.topics.map(t=>t.id));
    for(const l of data.lessons){
      check(ownTopics.has(l.topicId)&&!lessonIds.has(l.topicId),`教材のテーマIDが不正: ${l.topicId}`);lessonIds.add(l.topicId);counts.lessons++;
      check(nonempty(l.title)&&strings(l.objectives)&&Array.isArray(l.prerequisiteTopicIds)&&l.prerequisiteTopicIds.every(id=>topicIds.has(id)&&id!==l.topicId),`前提知識/目標が不正: ${l.topicId}`);
      check(l.sections?.length&&l.sections.every(s=>nonempty(s.title)&&nonempty(s.body))&&nonempty(l.example?.prompt)&&strings(l.example?.steps)&&nonempty(l.example?.answer),`教材本文が不足: ${l.topicId}`);
      check(l.quizzes?.length===3&&l.quizzes.every((q,i)=>q.id===`${l.topicId}-c${i+1}`)&&l.retest?.id===`${l.topicId}-retest`,`基礎テストの件数/ID: ${l.topicId}`);
      for(const q of [...l.quizzes,l.retest]){quiz(q);counts.quizzes++;}
    }
    const ownQuestions=questions.filter(q=>q.subjectId===subject.subjectId);
    check(data.solutions.length===ownQuestions.length,`解説件数が不正: ${subject.subjectId}`);
    for(const s of data.solutions){
      const original=ownQuestions.find(q=>q.id===s.questionId);
      check(original&&!solutionIds.has(s.questionId),`解説IDが不正: ${s.questionId}`);solutionIds.add(s.questionId);counts.solutions++;
      check(['verified','conditional','pending','draft'].includes(s.status),`検証状態が不正: ${s.questionId}`);counts[s.status]++;
      check(nonempty(s.problem)&&strings(s.basics)&&strings(s.steps)&&nonempty(s.answer)&&strings(s.checklist)&&strings(s.pitfalls)&&Array.isArray(s.assumptions)&&s.assumptions.every(nonempty)&&nonempty(s.verification),`解説本文の欠落: ${s.questionId}`);
      if(s.status==='conditional')check(s.assumptions.length>0,`仮定の欠落: ${s.questionId}`);
      if(original.minimumCharacters)check([...s.answer.replace(/\s/g,'')].length>=original.minimumCharacters,`答案例が文字数不足: ${s.questionId}`);
      if(subject.subjectId==='multimedia')check(nonempty(s.originalEnglish)&&nonempty(s.translation)&&(original.answerLanguage!=='en'||nonempty(s.englishAnswer)),`英語教材の欠落: ${s.questionId}`);
      if(s.autoCheck){check(s.status==='verified',`未検証の自動確認: ${s.questionId}`);quiz(s.autoCheck);counts.autoChecks++;}
      if(s.diagram){check(nonempty(s.diagram.alt)&&nonempty(s.diagram.src)&&/^figures\/[a-z0-9-]+\.svg$/.test(s.diagram.src),`図の参照が不正: ${s.questionId}`);await access(path.join(root,'public',s.diagram.src));}
    }
    const inspect=(x)=>{if(typeof x==='string')check(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x),`教材に制御文字: ${subject.subjectId}`);else if(x&&typeof x==='object')Object.values(x).forEach(inspect);};inspect(data);
    all.push(data);
  }
  check(lessonIds.size===69&&solutionIds.size===199&&counts.quizzes===276,'教材の全体件数が不正');
  return {all,quizIds:[...quizIds],counts};
}
