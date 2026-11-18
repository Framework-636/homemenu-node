import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import IngredientSearch from '../components/IngredientSearch.tsx';
import type { GroceryItem, Ingredient } from '../types.ts';

// The grocery list lets you add the same thing twice, so the search hides nothing.
const NO_EXCLUDES = new Set<number>();

// Same pattern as StaplesPage: check login here, keep the hooks in GroceryList.
export default function GroceryPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <GroceryList />;
}

// Staples and other items live in different tables, so their ids can collide.
// Source + id together is unique.
function itemKey(item: GroceryItem) {
  return `${item.source}-${item.id}`;
}

// Staples and other items also have different API paths.
function actionUrl(item: GroceryItem, action: 'got-it' | 'not-found') {
  const kind = item.source === 'staple' ? 'staples' : 'items';
  return `/api/grocery/${kind}/${item.id}/${action}`;
}

// '2026-11-17' -> 'Nov 17'. Built from the parts so the time zone can't shift the day.
function shortDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function GroceryList() {
  const { sessionExpired } = useAuth();

  const [items, setItems] = useState<GroceryItem[] | null>(null); // null = still loading
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // bump to reload the list
  const [customName, setCustomName] = useState(''); // the "anything else" text box

  const reload = () => setReloadKey((k) => k + 1);

  // Load the list (again whenever reloadKey changes).
  useEffect(() => {
    let ignore = false; // set if the page closes before the response arrives
    void (async () => {
      const res = await fetch('/api/grocery');
      if (ignore) return;
      if (res.status === 401) {
        sessionExpired();
        return;
      }
      if (!res.ok) {
        setError('Could not load your grocery list.');
        return;
      }
      const data = (await res.json()) as GroceryItem[];
      if (!ignore) setItems(data);
    })();
    return () => {
      ignore = true;
    };
  }, [reloadKey, sessionExpired]);

  // Every button on this page does the same thing: one request, then reload.
  // Returns true if it worked.
  async function send(method: 'POST' | 'DELETE', url: string, body?: unknown) {
    setError(null);
    const res = await sendJson(method, url, body);
    if (res.status === 401) {
      sessionExpired();
      return false;
    }
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    reload();
    return true;
  }

  const addIngredient = (ingredient: Ingredient) =>
    send('POST', '/api/grocery/items', { ingredient_id: ingredient.id });

  async function addCustom(event: FormEvent) {
    event.preventDefault(); // stop the browser's own form submit (a full page reload)
    const name = customName.trim();
    if (!name) return;
    if (await send('POST', '/api/grocery/items', { name })) setCustomName('');
  }

  const gotIt = (item: GroceryItem) => send('POST', actionUrl(item, 'got-it'));
  const notFound = (item: GroceryItem) => send('POST', actionUrl(item, 'not-found'));
  const remove = (item: GroceryItem) => send('DELETE', `/api/grocery/items/${item.id}`);

  if (items === null) {
    return error ? <p className="status error">{error}</p> : <p className="status">Loading…</p>;
  }

  // Group by category (the API already sorts by category, then name).
  const groups = new Map<string, GroceryItem[]>();
  for (const item of items) {
    const group = groups.get(item.category) ?? [];
    group.push(item);
    groups.set(item.category, group);
  }

  const missingCount = items.filter((i) => i.not_found_on !== null).length;

  return (
    <section className="grocery">
      <h1>Grocery list</h1>
      <p className="grocery-summary">
        {items.length === 1 ? '1 item' : `${items.length} items`}
        {missingCount > 0 ? ` · ${missingCount} not found last trip` : ''}
      </p>

      <IngredientSearch
        excludeIds={NO_EXCLUDES}
        onPick={(ingredient) => void addIngredient(ingredient)}
        placeholder="Add to the list: start typing (milk, rice, salsa…)"
        actionLabel="+ Add"
      />

      <form className="grocery-custom" onSubmit={(e) => void addCustom(e)}>
        <input
          type="text"
          placeholder="Anything else (paper towels, dog food…)"
          aria-label="Add something that isn't an ingredient"
          maxLength={160}
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <button type="submit" disabled={!customName.trim()}>
          Add
        </button>
      </form>

      {error && <p className="status error">{error}</p>}

      {items.length === 0 ? (
        <p className="status">
          Nothing to buy. Staples you mark as out of stock show up here on their own.
        </p>
      ) : (
        [...groups].map(([category, groupItems]) => (
          <div key={category} className="grocery-group">
            <h2>{category}</h2>
            <ul>
              {groupItems.map((item) => (
                <li key={itemKey(item)} className="grocery-item">
                  <div className="grocery-name">
                    <span>
                      {item.emoji} {item.name}
                    </span>
                    <span className="grocery-note">
                      {item.source === 'staple' && 'Staple'}
                      {item.source === 'recipe' && `For ${item.recipe_name ?? 'a recipe'}`}
                      {item.not_found_on && (
                        <span className="grocery-missing">
                          {item.source === 'manual' ? '' : ' · '}
                          Couldn't find it {shortDate(item.not_found_on)}
                        </span>
                      )}
                    </span>
                  </div>
                  <button type="button" className="grocery-got" onClick={() => void gotIt(item)}>
                    Got it
                  </button>
                  {!item.not_found_on && (
                    <button
                      type="button"
                      className="grocery-not-found"
                      onClick={() => void notFound(item)}
                    >
                      Couldn't find it
                    </button>
                  )}
                  {item.source !== 'staple' && (
                    <button
                      type="button"
                      className="grocery-remove"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => void remove(item)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
