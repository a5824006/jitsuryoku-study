import type { Question, Solution } from './types.ts';
import { gradeQuiz } from './grading.ts';
import { characterCount } from './state.ts';

export function parsePracticeAnswer(solution: Solution, draft: string): string | string[] {
  if (solution.autoCheck?.kind !== 'multiple-choice') return draft;
  try {
    const answer: unknown = JSON.parse(draft || '[]');
    return Array.isArray(answer) ? answer.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export function reviewAnswer(question: Question, solution: Solution, draft: string, checks: number[]) {
  const answer = parsePracticeAnswer(solution, draft);
  const answered = Array.isArray(answer) ? answer.length > 0 : answer.trim().length > 0;
  const automatic = answered && solution.status === 'verified' && solution.autoCheck
    ? gradeQuiz(solution.autoCheck, answer) : null;
  const missingRequirements: string[] = [];
  if (question.minimumCharacters && characterCount(draft) < question.minimumCharacters) {
    missingRequirements.push(`文字数：${characterCount(draft)} / ${question.minimumCharacters}字以上`);
  }
  const missingKeywords = question.keywords.filter(word => !draft.includes(word));
  if (missingKeywords.length) missingRequirements.push(`指定語句：${missingKeywords.join('、')}`);
  const unchecked = solution.checklist.filter((_, i) => !checks.includes(i));
  return { answered, automatic, missingRequirements, unchecked };
}
