import { useState } from 'react';
import { useNavigate } from 'react-router';
import { sendJson } from '../api.ts';
import { useAuth } from '../auth/AuthContext.ts';

interface DeleteRecipeButtonProps {
  recipeId: number;
  recipeName: string;
}

// Two-step delete: click Delete, then confirm. Nothing is deleted on the first click.
export function DeleteRecipeButton({ recipeId, recipeName }: DeleteRecipeButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { sessionExpired } = useAuth();

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await sendJson('DELETE', `/api/recipes/${recipeId}`);
    if (result.ok) {
      navigate('/'); // back to the list, which reloads without this recipe
      return;
    }
    if (result.status === 401) {
      sessionExpired();
      return;
    }
    setDeleting(false);
    setConfirming(false);
    setError(result.error);
  }

  if (!confirming) {
    return (
      <>
        <button type="button" className="danger-link" onClick={() => setConfirming(true)}>
          🗑️ Delete
        </button>
        {error && <p className="error">{error}</p>}
      </>
    );
  }

  return (
    <div className="confirm-delete" role="alertdialog" aria-label="Confirm delete">
      <span>Delete “{recipeName}”? This can’t be undone.</span>
      <button
        type="button"
        className="danger-btn"
        disabled={deleting}
        onClick={() => void handleDelete()}
      >
        {deleting ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" disabled={deleting} onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}
