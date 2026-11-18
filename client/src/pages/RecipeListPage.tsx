import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../useApi.ts';
import { useAuth } from '../auth/AuthContext.ts';
import { shortDate } from '../dates.ts';
import type { RecipeSummary } from '../types.ts';

type Filter = 'all' | 'mine' | 'saved';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'saved', label: '★ Saved' },
];

const EMPTY_MESSAGE: Record<Filter, string> = {
  all: 'No recipes yet.',
  mine: "You haven't added a recipe yet. Use + New recipe to add one.",
  saved: 'Nothing saved yet. Open a recipe and press ☆ Save to keep it here.',
};

export default function RecipeListPage() {
  const { user } = useAuth();
  const { data: recipes, loading, error } = useApi<RecipeSummary[]>('/api/recipes');
  const [filter, setFilter] = useState<Filter>('all');

  if (loading) return <p className="status">Loading recipes…</p>;
  if (error || !recipes) return <p className="status error">Couldn't load recipes: {error}</p>;

  const shown = recipes.filter((recipe) => {
    if (filter === 'mine') return recipe.user_id === user?.id;
    if (filter === 'saved') return recipe.saved;
    return true;
  });

  return (
    <>
      {/* Mine and Saved only mean something when someone is logged in. */}
      {user && (
        <div className="recipe-filters" role="group" aria-label="Which recipes to show">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'filter-chip active' : 'filter-chip'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="status">{EMPTY_MESSAGE[filter]}</p>
      ) : (
        <ul className="recipe-grid">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <Link to={`/recipes/${recipe.id}`} className="recipe-card">
                <span className="emoji">{recipe.emoji}</span>
                <h2>{recipe.name}</h2>
                {recipe.visibility === 'private' && <span className="badge">🔒 Private</span>}
                {recipe.saved && <span className="badge saved-badge">★ Saved</span>}
                <p>
                  {recipe.category} · {recipe.prep_time + recipe.cook_time} min · serves{' '}
                  {recipe.servings}
                </p>
                {recipe.last_made && <p>Last made {shortDate(recipe.last_made)}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
