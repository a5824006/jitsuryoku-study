import type { Exercise, LearningIndexItem, Progress } from './types.ts';
export function needsReview(item: Pick<LearningIndexItem,'id'|'kind'>, progress: Progress) {
  return item.kind==='self-check' ? progress.selfAssessments[item.id]?.result==='review' : progress.quizAttempts[item.id]?.correct===false;
}
export function exerciseSummary(exercises: Exercise[], progress: Progress) {
  const automatic=exercises.filter(e=>e.kind!=='self-check');
  const manual=exercises.filter(e=>e.kind==='self-check');
  return { correct: automatic.filter(e=>progress.quizAttempts[e.id]?.correct===true).length, automatic: automatic.length,
    selfConfirmed: manual.filter(e=>progress.selfAssessments[e.id]?.result==='understood').length, manual: manual.length,
    review: exercises.filter(e=>needsReview(e,progress)).length,
    unattempted: exercises.filter(e=>e.kind==='self-check'?!progress.selfAssessments[e.id]:!progress.quizAttempts[e.id]).length };
}
