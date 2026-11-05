import { useEffect, useState } from 'react';
import type { RecipeSummary } from './types';
import './App.css';

export default function App() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/recipes')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<RecipeSummary[]>;
      })
      .then(setRecipes)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="status">Loading recipes…</p>;
  if (error) return <p className="status error">Couldn't load recipes: {error}</p>;

  return (
    <main className="page">
      <h1>HomeMenu</h1>
      <ul className="recipe-grid">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="recipe-card">
            <span className="emoji">{recipe.emoji}</span>
            <h2>{recipe.name}</h2>
            <p>
              {recipe.category} · {recipe.prep_time + recipe.cook_time} min · serves{' '}
              {recipe.servings}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
