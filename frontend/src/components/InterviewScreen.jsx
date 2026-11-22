import { useCallback, useEffect, useRef, useState } from 'react';
import './interview.css';

const ADVANCE_MS = 150;

const pad = (value) => String(value).padStart(2, '0');

const labelFor = (field) =>
  field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const initialAnswers = (questions, initialProfile) => {
  const next = {};
  questions.forEach((question) => {
    if (initialProfile?.[question.field] === true) next[question.field] = 'yes';
  });
  return next;
};

export default function InterviewScreen({
  questions = [],
  initialProfile,
  onSubmit,
  onCancel,
  onSkipAll
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => initialAnswers(questions, initialProfile));
  const timerRef = useRef(null);
  const advancingRef = useRef(false);
  const headingRef = useRef(null);

  const isSummary = index >= questions.length;
  const currentQuestion = isSummary ? null : questions[index];
  const total = questions.length;
  const progress = total > 0 ? Math.min((index / total) * 100, 100) : 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  const advance = useCallback(() => {
    setIndex((current) => Math.min(current + 1, questions.length));
  }, [questions.length]);

  const choice = useCallback(
    (value) => {
      if (!currentQuestion || advancingRef.current) return;
      advancingRef.current = true;
      setAnswers((previous) => ({ ...previous, [currentQuestion.field]: value }));
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        advancingRef.current = false;
        advance();
      }, ADVANCE_MS);
    },
    [advance, clearTimer, currentQuestion]
  );

  const skipQuestion = useCallback(() => {
    if (!currentQuestion) return;
    clearTimer();
    advancingRef.current = false;
    setAnswers((previous) => ({ ...previous, [currentQuestion.field]: 'skip' }));
    advance();
  }, [advance, clearTimer, currentQuestion]);

  const goPrevious = useCallback(() => {
    clearTimer();
    advancingRef.current = false;
    setIndex((current) => Math.max(0, current - 1));
  }, [clearTimer]);

  const goBack = useCallback(() => {
    clearTimer();
    advancingRef.current = false;
    if (index === 0) {
      onCancel?.();
      return;
    }
    setIndex((current) => Math.max(0, current - 1));
  }, [clearTimer, index, onCancel]);

  const tweakAnswers = useCallback(() => {
    clearTimer();
    advancingRef.current = false;
    setIndex(Math.max(0, questions.length - 1));
  }, [clearTimer, questions.length]);

  const skipAll = useCallback(() => {
    clearTimer();
    advancingRef.current = false;
    onSkipAll?.();
  }, [clearTimer, onSkipAll]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      if (index >= questions.length) return;

      const key = event.key.toLowerCase();
      if (key === 'a' || key === '1') {
        event.preventDefault();
        choice('yes');
      } else if (key === 'b' || key === '2') {
        event.preventDefault();
        choice('no');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [choice, goPrevious, index, questions.length]);

  const buildProfile = () => {
    const profile = { ...(initialProfile || {}) };
    Object.entries(answers).forEach(([field, value]) => {
      if (value === 'yes') profile[field] = true;
      else if (value === 'no') profile[field] = false;
    });
    return profile;
  };

  const valueFor = (field) => {
    const answer = answers[field];
    if (answer === 'yes') return 'Yes';
    if (answer === 'no') return 'No';
    if (answer === 'skip') return '—';
    return initialProfile?.[field] === true ? 'Yes' : '—';
  };

  const summaryAnswer = (field) => {
    const answer = answers[field];
    if (answer === 'yes') return 'Yes';
    if (answer === 'no') return 'No';
    return 'Not answered';
  };

  const progressLabel = isSummary
    ? `Question ${pad(total)} / ${pad(total)}`
    : `Question ${pad(index + 1)} / ${pad(total)}`;

  return (
    <section className="screen interview" aria-label="Interview">
      <div className="interview__main">
        <div className="interview-progress">
          <span className="interview-progress__meta">{progressLabel}</span>
          <div
            className="interview-progress__track"
            role="progressbar"
            aria-label="Interview progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={index}
          >
            <span className="interview-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {isSummary ? (
          <div className="interview-summary">
            <h2 className="interview-question" ref={headingRef} tabIndex={-1}>
              Your profile, as answered.
            </h2>
            <table className="summary-table">
              <caption className="sr-only">Interview answers</caption>
              <thead>
                <tr>
                  <th scope="col">Signal</th>
                  <th scope="col">Answer</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.field}>
                    <th scope="row">{labelFor(question.field)}</th>
                    <td>{summaryAnswer(question.field)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="interview-summary__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onSubmit?.(buildProfile())}
              >
                Run the match
              </button>
              <button type="button" className="btn btn--text" onClick={tweakAnswers}>
                Tweak answers
              </button>
              <button type="button" className="btn btn--text" onClick={skipAll}>
                Skip all questions
              </button>
            </div>
          </div>
        ) : (
          <div className="interview-step">
            <h2 className="interview-question" ref={headingRef} tabIndex={-1}>
              {currentQuestion.question}
            </h2>

            <div
              className="answer-group"
              role="radiogroup"
              aria-label={currentQuestion.question}
            >
              <button
                type="button"
                role="radio"
                aria-checked={answers[currentQuestion.field] === 'yes'}
                className="answer-row"
                onClick={() => choice('yes')}
              >
                <span className="answer-row__letter" aria-hidden="true">
                  A
                </span>
                <span className="answer-row__body">
                  <span className="answer-row__title">{currentQuestion.yes_title || 'Yes'}</span>
                  {currentQuestion.yes_desc ? (
                    <span className="answer-row__desc">{currentQuestion.yes_desc}</span>
                  ) : null}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={answers[currentQuestion.field] === 'no'}
                className="answer-row"
                onClick={() => choice('no')}
              >
                <span className="answer-row__letter" aria-hidden="true">
                  B
                </span>
                <span className="answer-row__body">
                  <span className="answer-row__title">{currentQuestion.no_title || 'No'}</span>
                  {currentQuestion.no_desc ? (
                    <span className="answer-row__desc">{currentQuestion.no_desc}</span>
                  ) : null}
                </span>
              </button>
            </div>

            <p className="interview-keys">
              <span>A or 1 for yes</span>
              <span>B or 2 for no</span>
              <span>Left arrow to go back</span>
            </p>

            <div className="interview-footer">
              <button type="button" className="btn btn--text" onClick={goBack}>
                {index === 0 ? 'Back to profile' : 'Previous'}
              </button>
              <button type="button" className="btn btn--text" onClick={skipQuestion}>
                Skip this question
              </button>
              <button type="button" className="btn btn--text" onClick={skipAll}>
                Skip all questions
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="interview__aside" aria-label="Profile as understood">
        <div className="ledger">
          <h2 className="ledger__title">Profile as understood</h2>
          <dl className="ledger__list">
            {questions.map((question) => (
              <div className="ledger__row" key={question.field}>
                <dt>{labelFor(question.field)}</dt>
                <dd className={answers[question.field] ? 'ledger__value is-set' : 'ledger__value'}>
                  {valueFor(question.field)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </section>
  );
}
