import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import { shortDate, todayLocal } from '../dates.ts';
import type { RecipeDetail } from '../types.ts';

interface RecipeActionsProps {
  recipe: RecipeDetail;
  isOwner: boolean;
}

// "We made this" and Save, shown on the recipe page for logged-in users.
// The recipe page gives this a key of the recipe id, so its state starts
// fresh from the server's values whenever a different recipe is opened.
export default function RecipeActions({ recipe, isOwner }: RecipeActionsProps) {
  const { sessionExpired } = useAuth();
  const [lastMade, setLastMade] = useState(recipe.last_made);
  const [saved, setSaved] = useState(recipe.saved);
  const [busy, setBusy] = useState(false); // a request is in flight; ignore extra taps
  const [error, setError] = useState<string | null>(null);

  const today = todayLocal();
  const madeToday = lastMade === today;

  // One request at a time. Returns the response data, or null if it failed.
  async function send<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await sendJson<T>(method, `/api/recipes/${recipe.id}/${path}`, body);
    setBusy(false);
    if (res.status === 401) {
      sessionExpired();
      return null;
    }
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    return { data: res.data };
  }

  async function madeThis() {
    const res = await send<{ last_made: string | null }>('POST', 'cooked', { cooked_on: today });
    if (res?.data) setLastMade(res.data.last_made);
  }

  async function undoMadeThis() {
    const res = await send<{ last_made: string | null }>('DELETE', `cooked/${today}`);
    if (res?.data) setLastMade(res.data.last_made);
  }

  async function toggleSaved() {
    const res = await send(saved ? 'DELETE' : 'PUT', 'saved');
    if (res) setSaved(!saved);
  }

  return (
    <div className="recipe-actions">
      {madeToday ? (
        <>
          <span className="made-today">✓ Made today</span>
          <button
            type="button"
            className="link-btn"
            disabled={busy}
            onClick={() => void undoMadeThis()}
          >
            Undo
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="made-btn"
            disabled={busy}
            onClick={() => void madeThis()}
          >
            ✓ We made this
          </button>
          <span className="last-made">
            {lastMade ? `Last made ${shortDate(lastMade)}` : 'Not made yet'}
          </span>
        </>
      )}

      {/* Your own recipes are already yours; private ones can't be someone else's to save. */}
      {!isOwner && (
        <button
          type="button"
          className={saved ? 'save-btn saved' : 'save-btn'}
          aria-pressed={saved}
          disabled={busy}
          onClick={() => void toggleSaved()}
        >
          {saved ? '★ Saved' : '☆ Save'}
        </button>
      )}

      {error && <p className="error recipe-actions-error">{error}</p>}
    </div>
  );
}
