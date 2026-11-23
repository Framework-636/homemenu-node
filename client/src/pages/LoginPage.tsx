import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Go to the recipe list.
  if (user) return <Navigate to="/" replace />;

  // Used by both the form and the demo button, so it takes the name and password as arguments.
  async function logIn(name: string, pass: string) {
    setSubmitting(true);
    setError(null);
    const message = await login(name, pass);
    setSubmitting(false);
    if (message) setError(message);
    // On success, `user` is set, this page re-renders, and <Navigate> redirects.
  }

  return (
    <div className="login-page">
      <h1>Log in</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void logIn(username, password);
        }}
      >
        <label>
          Username or email
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="status">
        Just looking around?{' '}
        <button
          type="button"
          disabled={submitting}
          onClick={() => void logIn('demo', 'demo-password')}
        >
          Try the demo
        </button>
      </p>
    </div>
  );
}
