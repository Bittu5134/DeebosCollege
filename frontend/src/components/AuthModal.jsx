import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Modal from './ui/Modal';
import Field from './ui/Field';
import api, { ApiError } from '../api';
import './auth.css';

function AuthForm({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const trimmed = email.trim();
    if (!trimmed.includes('@')) {
      setFieldError('Enter an email address with an @.');
      emailRef.current?.focus();
      return;
    }
    setFieldError('');
    setSubmitting(true);

    try {
      const data = await api.login({ name: name.trim(), email: trimmed });
      localStorage.setItem('alpha_token', data.access_token);
      localStorage.setItem('alpha_user', JSON.stringify(data.user));
      onSuccess?.(data);
      onClose?.();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not create a session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <p className="auth-note">
        Demo access: any email creates a local session. No password, no identity provider.
      </p>

      <Field id="auth-name" label="Name (optional)" hint="Leave blank to sign in as Student.">
        <input
          id="auth-name"
          className="input"
          type="text"
          name="name"
          placeholder="Student"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field id="auth-email" label="Email" error={fieldError}>
        <input
          id="auth-email"
          ref={emailRef}
          className="input"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          data-autofocus
          aria-invalid={fieldError ? 'true' : undefined}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError('');
          }}
        />
      </Field>

      {submitError ? <p className="auth-error">{submitError}</p> : null}

      <div className="auth-actions">
        <button type="submit" className="btn btn--primary auth-submit" disabled={submitting}>
          {submitting ? 'Creating session...' : 'Create session'}
          {submitting ? null : <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />}
        </button>
        <button type="button" className="btn btn--text btn--sm" onClick={onClose}>
          Continue as guest
        </button>
      </div>
    </form>
  );
}

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Demo access" className="auth-modal">
      <AuthForm onClose={onClose} onSuccess={onSuccess} />
    </Modal>
  );
}
