import React, { useEffect, useMemo, useState } from 'react';

type TestResult = {
  expr: string;
  expected: number;
  actual: number | string;
  pass: boolean;
};

function sanitize(expr: string): string {
  return expr.replace(/[^0-9+\-*/().\s]/g, '');
}

function evaluateExpression(expr: string): number {
  const cleaned = sanitize(expr);
  if (!cleaned.trim()) throw new Error('Empty expression');
  const forbidden = /[+\-*/]{2,}(?!\()/;
  if (forbidden.test(cleaned)) {
    throw new Error('Invalid operator sequence');
  }
  let result: unknown;
  try {
    result = Function("'use strict'; return (" + cleaned + ");")();
  } catch {
    throw new Error('Invalid expression');
  }
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Computation error');
  }
  return result;
}

function approxEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

export default function App() {
  const [expr, setExpr] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lastResult, setLastResult] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  const display = useMemo(() => (expr || lastResult || '0'), [expr, lastResult]);

  const append = (s: string) => {
    setError('');
    setTestResults(null);
    setExpr((prev) => (prev + s).slice(0, 64));
  };

  const clearAll = () => {
    setError('');
    setTestResults(null);
    setExpr('');
    setLastResult('');
  };

  const backspace = () => {
    setError('');
    setExpr((prev) => prev.slice(0, -1));
  };

  const calculate = () => {
    try {
      const value = evaluateExpression(expr);
      const formatted = Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
      setLastResult(formatted);
      setExpr('');
      setError('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error';
      setError(msg);
      setLastResult('');
    }
  };

  const runSelfCheck = () => {
    const cases = [
      { expr: '1+2', expected: 3 },
      { expr: '5-2', expected: 3 },
      { expr: '3*4', expected: 12 },
      { expr: '12/3', expected: 4 },
      { expr: '2+2*2', expected: 6 },
      { expr: '(2+2)*2', expected: 8 }
    ];
    const results: TestResult[] = cases.map((c) => {
      try {
        const actual = evaluateExpression(c.expr);
        const pass = approxEqual(actual, c.expected);
        return { expr: c.expr, expected: c.expected, actual, pass };
      } catch (e) {
        return { expr: c.expr, expected: c.expected, actual: e instanceof Error ? e.message : 'Error', pass: false };
      }
    });
    setTestResults(results);
    const allPass = results.every((r) => r.pass);
    setError(allPass ? '' : 'Self-check failed');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) { append(k); return; }
      if (k === '+' || k === '-' || k === '*' || k === '/' || k === '.' || k === '(' || k === ')') { append(k); return; }
      if (k === 'Enter' || k === '=') { e.preventDefault(); calculate(); return; }
      if (k === 'Backspace') { backspace(); return; }
      if (k === 'Escape') { clearAll(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const buttons: { label: string; value?: string; className?: string; onClick?: () => void }[] = [
    { label: 'C', onClick: clearAll },
    { label: '←', onClick: backspace },
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '÷', value: '/', className: 'operator' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '×', value: '*', className: 'operator' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '−', value: '-', className: 'operator' },
    { label: '0', value: '0', className: 'wide' },
    { label: '.', value: '.' },
    { label: '+', value: '+', className: 'operator' },
    { label: '=', onClick: calculate, className: 'equal' }
  ];

  return (
    <div className="app">
      <div className="card">
        <h1>Calculator</h1>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 8 }}>自動修正ループテスト</div>
        <div className="display" aria-live="polite">{display}</div>
        <div className="keypad">
          {buttons.map((b, i) => (
            <button
              key={i}
              className={b.className || ''}
              onClick={
                b.onClick
                  ? b.onClick
                  : () => {
                      if (b.value) append(b.value);
                    }
              }
            >
              {b.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={runSelfCheck}>Run self-check</button>
        </div>
        {error ? <div className="status ng">Error: {error}</div> : null}
        {testResults && (
          <div className={`status ${testResults.every((r) => r.pass) ? 'ok' : 'ng'}`}>
            {testResults.every((r) => r.pass) ? 'All tests passed' : 'Some tests failed'}
            <ul>
              {testResults.map((r, idx) => (
                <li key={idx}>
                  {r.expr} = {String(r.actual)} {r.pass ? '✓' : `≠ ${r.expected}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
          Tip: You can type on the keyboard too.
        </p>
      </div>
    </div>
  );
}
