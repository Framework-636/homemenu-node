import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.ts';
import type { Ingredient } from '../types.ts';

interface IngredientSearchProps {
  excludeIds: Set<number>; // ingredients already on the list; hidden from results
  onPick: (ingredient: Ingredient) => void;
  placeholder: string;
  actionLabel: string; // e.g. "+ Add" or "+ Avoid"
}

// Search box over the ingredient catalog. Shared by the Staples and Avoid pages.
export default function IngredientSearch({
  excludeIds,
  onPick,
  placeholder,
  actionLabel,
}: IngredientSearchProps) {
  const { sessionExpired } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Ingredient[]>([]);

  // Search 250 ms after the user stops typing.
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

  const matches = query.trim() ? results.filter((i) => !excludeIds.has(i.id)).slice(0, 8) : [];

  return (
    <div className="ingredient-search">
      <input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={placeholder}
      />
      {matches.length > 0 && (
        <ul className="ingredient-results">
          {matches.map((ingredient) => (
            <li key={ingredient.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(ingredient);
                  setQuery('');
                }}
              >
                <span>
                  {ingredient.emoji} {ingredient.name}
                </span>
                <span className="ingredient-category">{ingredient.category}</span>
                <span className="ingredient-add">{actionLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
