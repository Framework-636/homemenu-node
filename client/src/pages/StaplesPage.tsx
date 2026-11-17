import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import type { Ingredient, Staple } from '../types.ts';

// The page itself only checks login, then hands off to StaplesManager.
// Keeping the hooks in a separate component means they never run for guests.
export default function StaplesPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <StaplesManager />;
}

function StaplesManager() {
  const { sessionExpired } = useAuth();

  const [staples, setStaples] = useState<Staple[] | null>(null); // null = still loading
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to reload the list

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Ingredient[]>([]);

  const reload = () => setReloadKey((k) => k + 1);

  // Load the user's staples (again whenever reloadKey changes).
  useEffect(() => {
    let ignore = false; // set if the page closes before the response arrives
    void (async () => {
      const res = await fetch('/api/staples');
      if (ignore) return;
      if (res.status === 401) {
        sessionExpired();
        return;
      }
      if (!res.ok) {
        setError('Could not load your staples.');
        return;
      }
      const data = (await res.json()) as Staple[];
      if (!ignore) setStaples(data);
    })();
    return () => {
      ignore = true;
    };
  }, [reloadKey, sessionExpired]);

  // Search the catalog 250 ms after the user stops typing.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let ignore = false;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/ingredients?q=${encodeURIComponent(q)}`);
      if (ignore) return;
      if (res.status === 401) {
        sessionExpired();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as Ingredient[];
      if (!ignore) setResults(data);
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer); // typing again cancels the pending search
    };
  }, [query, sessionExpired]);

  async function addStaple(ingredient: Ingredient) {
    setError(null);
    const res = await sendJson<{ id: number }>('POST', '/api/staples', {
      ingredient_id: ingredient.id,
    });
    if (res.status === 401) {
      sessionExpired();
      return;
    }
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setQuery('');
    reload();
  }

  async function toggleStock(staple: Staple) {
    setError(null);
    const next = !staple.in_stock;
    // Update the screen right away, then tell the server ("optimistic update").
    setStaples((list) =>
      list ? list.map((s) => (s.id === staple.id ? { ...s, in_stock: next } : s)) : list
    );
    const res = await sendJson('PATCH', `/api/staples/${staple.id}`, { in_stock: next });
    if (res.status === 401) {
      sessionExpired();
      return;
    }
    if (!res.ok) {
      setError(res.error);
      reload(); // put the screen back in sync with the server
    }
  }

  async function removeStaple(staple: Staple) {
    setError(null);
    const res = await sendJson('DELETE', `/api/staples/${staple.id}`);
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

  if (staples === null) {
    return error ? <p className="status error">{error}</p> : <p className="status">Loading…</p>;
  }

  // Hide search results that are already staples.
  const owned = new Set(staples.map((s) => s.ingredient_id));
  const matches = query.trim() ? results.filter((i) => !owned.has(i.id)).slice(0, 8) : [];

  // Group staples by category (the API already sorts by category, then name).
  const groups = new Map<string, Staple[]>();
  for (const staple of staples) {
    const group = groups.get(staple.category) ?? [];
    group.push(staple);
    groups.set(staple.category, group);
  }

  const outCount = staples.filter((s) => !s.in_stock).length;

  return (
    <section className="staples">
      <h1>Kitchen staples</h1>
      <p className="staples-summary">
        {staples.length} staples
        {outCount > 0 ? ` · ${outCount} out of stock` : ' · all in stock'}
      </p>

      <div className="staple-search">
        <input
          type="search"
          placeholder="Add a staple: start typing (milk, rice, salsa…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search ingredients to add"
        />
        {matches.length > 0 && (
          <ul className="staple-results">
            {matches.map((ingredient) => (
              <li key={ingredient.id}>
                <button type="button" onClick={() => void addStaple(ingredient)}>
                  <span>
                    {ingredient.emoji} {ingredient.name}
                  </span>
                  <span className="staple-category">{ingredient.category}</span>
                  <span className="staple-add">+ Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="status error">{error}</p>}

      {staples.length === 0 ? (
        <p className="status">
          No staples yet. Add the things you always keep in the house, like milk, eggs or rice.
        </p>
      ) : (
        [...groups].map(([category, items]) => (
          <div key={category} className="staple-group">
            <h2>{category}</h2>
            <ul>
              {items.map((staple) => (
                <li key={staple.id} className={staple.in_stock ? 'staple' : 'staple out'}>
                  <span className="staple-name">
                    {staple.emoji} {staple.name}
                  </span>
                  <button
                    type="button"
                    className="stock-toggle"
                    aria-pressed={!staple.in_stock}
                    onClick={() => void toggleStock(staple)}
                  >
                    {staple.in_stock ? 'In stock' : 'Out'}
                  </button>
                  <button
                    type="button"
                    className="staple-remove"
                    aria-label={`Remove ${staple.name}`}
                    onClick={() => void removeStaple(staple)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
