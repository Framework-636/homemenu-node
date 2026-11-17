import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import IngredientSearch from '../components/IngredientSearch.tsx';
import type { Avoid, Ingredient } from '../types.ts';

export default function AvoidPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AvoidManager />;
}

function AvoidManager() {
  const { sessionExpired } = useAuth();

  const [avoids, setAvoids] = useState<Avoid[] | null>(null); // null = still loading
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      const res = await fetch('/api/avoids');
      if (ignore) return;
      if (res.status === 401) {
        sessionExpired();
        return;
      }
      if (!res.ok) {
        setError('Could not load your avoid list.');
        return;
      }
      const data = (await res.json()) as Avoid[];
      if (!ignore) setAvoids(data);
    })();
    return () => {
      ignore = true;
    };
  }, [reloadKey, sessionExpired]);

  async function addAvoid(ingredient: Ingredient) {
    setError(null);
    const res = await sendJson('POST', '/api/avoids', { ingredient_id: ingredient.id });
    if (res.status === 401) {
      sessionExpired();
      return;
    }
    if (!res.ok) {
      setError(res.error);
      return;
    }
    reload();
  }

  async function removeAvoid(avoid: Avoid) {
    setError(null);
    const res = await sendJson('DELETE', `/api/avoids/${avoid.ingredient_id}`);
    if (res.status === 401) {
      sessionExpired();
      return;
    }
    if (!res.ok) {
      setError(res.error);
      return;
    }
    reload();
  }

  if (avoids === null) {
    return error ? <p className="status error">{error}</p> : <p className="status">Loading…</p>;
  }

  return (
    <section className="avoid">
      <h1>Avoid list</h1>
      <p className="avoid-intro">
        Recipes that use any of these ingredients never show up on Tonight&apos;s Menu.
      </p>

      <IngredientSearch
        excludeIds={new Set(avoids.map((a) => a.ingredient_id))}
        onPick={(ingredient) => void addAvoid(ingredient)}
        placeholder="Never suggest… (sardines, tomatoes)"
        actionLabel="+ Avoid"
      />

      {error && <p className="status error">{error}</p>}

      {avoids.length === 0 ? (
        <p className="status">Nothing avoided yet. Everything is fair game.</p>
      ) : (
        <ul className="avoid-list">
          {avoids.map((avoid) => (
            <li key={avoid.ingredient_id} className="avoid-item">
              <span className="avoid-name">
                {avoid.emoji} {avoid.name}
              </span>
              <span className="ingredient-category">{avoid.category}</span>
              <button
                type="button"
                className="avoid-remove"
                aria-label={`Stop avoiding ${avoid.name}`}
                onClick={() => void removeAvoid(avoid)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
