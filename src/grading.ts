import type { Quiz } from './types.ts';
const normalize = (text: string) => text.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
export function gradeQuiz(quiz: Quiz, input: string | string[]): boolean {
  if (quiz.kind === 'choice' || quiz.kind === 'multiple-choice') {
    const given = Array.isArray(input) ? input : input ? [input] : [];
    const expected = quiz.correctOptions ?? [];
    return expected.length > 0 && new Set(given).size === given.length && given.length === expected.length && given.every(x => expected.includes(x));
  }
  if (typeof input !== 'string' || !input.trim()) return false;
  if (quiz.kind === 'number') {
    const value = input.normalize('NFKC').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return false;
    const n = Number(value);
    return Number.isFinite(n) && typeof quiz.numericAnswer === 'number' && Math.abs(n - quiz.numericAnswer) <= (quiz.tolerance ?? 0);
  }
  if (quiz.kind === 'bits') return /^[01]+$/.test(input.trim()) && (quiz.acceptedAnswers ?? []).includes(input.trim());
  return (quiz.acceptedAnswers ?? []).some(a => normalize(a) === normalize(input));
}
