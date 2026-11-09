import { Link, useParams } from 'react-router';
import { useApi } from '../useApi.ts';
import type { RecipeDetail } from '../types.ts';
import { useAuth } from '../auth/AuthContext.ts';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const { data: recipe, loading, error, notFound } = useApi<RecipeDetail>(`/api/recipes/${id}`);
  const { user } = useAuth();

  if (loading) return <p className="status">Loading recipe…</p>;
  if (notFound) {
    return (
      <div className="status">
        <p>Recipe not found.</p>
        <Link to="/">Back to all recipes</Link>
      </div>
    );
  }
  if (error || !recipe) return <p className="status error">Couldn't load recipe: {error}</p>;

  return (
    <article className="recipe-detail">
      <Link to="/" className="back">
        ← All recipes
      </Link>
      <h1>
        <span className="emoji">{recipe.emoji}</span> {recipe.name}
      </h1>
      {user && recipe.user_id === user.id && (
        <Link to={`/recipes/${recipe.id}/edit`} className="edit-link">
          ✏️ Edit recipe
        </Link>
      )}
      <p className="meta">
        {recipe.category} · prep {recipe.prep_time} min · cook {recipe.cook_time} min · serves{' '}
        {recipe.servings}
      </p>
      {recipe.description && <p>{recipe.description}</p>}
      {recipe.tags.length > 0 && (
        <ul className="tags">
          {recipe.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}

      <h2>Ingredients</h2>
      <ul>
        {recipe.ingredients.map((item, index) => (
          <li key={index}>
            {[item.quantity, item.unit, item.ingredient].filter(Boolean).join(' ')}
          </li>
        ))}
      </ul>

      <h2>Instructions</h2>
      <ol>
        {recipe.instructions.map((step) => (
          <li key={step.step_number}>{step.instruction}</li>
        ))}
      </ol>
    </article>
  );
}
