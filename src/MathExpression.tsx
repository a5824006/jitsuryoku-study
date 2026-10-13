import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function MathExpression({ value }: { value: string }) {
  return <div className="math-expression" role="math" aria-label={value}
    dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { throwOnError: false, displayMode: true }) }} />;
}
