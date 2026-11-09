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

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const message = await login(username, password);
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
          void handleSubmit();
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
        Demo account: <code>demo</code> / <code>demo-password</code>
      </p>
    </div>
  );
}
