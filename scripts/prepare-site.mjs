import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateLearning } from './validate-learning.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aggregate = JSON.parse(await readFile(path.join(root, 'data/analysis/aggregate.json'), 'utf8'));
const target = path.join(root, 'public/data');
await mkdir(target, { recursive: true });
const subjects = [];
const questions = [];
for (const summary of aggregate.subjects) {
  const subject = JSON.parse(await readFile(path.join(root, `data/analysis/subjects/${summary.subjectId}.json`), 'utf8'));
  const topics = aggregate.topics.filter(t => t.subjectId === summary.subjectId);
  subjects.push({ ...summary, prerequisites: subject.prerequisites, answerTraits: subject.answerTraits, preparation: subject.preparation, overlaps: subject.overlaps, topics });
  for (const paper of subject.papers) for (const q of paper.questions) questions.push({ ...q, subjectId: subject.subjectId, year: paper.year, sourceFile: paper.sourceFile, answerLanguage: paper.answerLanguage });
  await writeFile(path.join(target, `${summary.subjectId}.json`), JSON.stringify(subject), 'utf8');
}
if (subjects.length !== 9 || questions.length !== 199 || new Set(questions.map(q => q.id)).size !== questions.length) throw new Error('分析データの件数またはIDが不正です');
const learning = await validateLearning(root, subjects, questions);
await mkdir(path.join(target, 'learning'), { recursive: true });
for (const data of learning.all) await writeFile(path.join(target, 'learning', `${data.subjectId}.json`), JSON.stringify(data), 'utf8');
await writeFile(path.join(target, 'catalog.json'), JSON.stringify({ schemaVersion: 1, analyzedAt: aggregate.analyzedAt, subjects, questions, quizIds: learning.quizIds }), 'utf8');
await writeFile(path.join(target, 'learning-coverage.json'), JSON.stringify(learning.counts, null, 2), 'utf8');
await copyFile(path.join(root, 'reports/analysis.md'), path.join(target, 'analysis.md'));
await copyFile(path.join(root, 'reports/verification.md'), path.join(target, 'verification.md'));
console.log(`Site data: ${subjects.length} subjects / ${questions.length} questions`);
console.log(`Learning data: ${JSON.stringify(learning.counts)}`);
