import { Link } from 'react-router';
import { useApi } from '../useApi.ts';
import type { RecipeSummary } from '../types.ts';

export default function RecipeListPage() {
  const { data: recipes, loading, error } = useApi<RecipeSummary[]>('/api/recipes');

  if (loading) return <p className="status">Loading recipes…</p>;
  if (error || !recipes) return <p className="status error">Couldn't load recipes: {error}</p>;

  return (
    <ul className="recipe-grid">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Link to={`/recipes/${recipe.id}`} className="recipe-card">
            <span className="emoji">{recipe.emoji}</span>
            <h2>{recipe.name}</h2>
            {recipe.visibility === 'private' && <span className="badge">🔒 Private</span>}
            <p>
              {recipe.category} · {recipe.prep_time + recipe.cook_time} min · serves{' '}
              {recipe.servings}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
