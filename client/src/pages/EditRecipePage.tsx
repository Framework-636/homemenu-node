import { Navigate, useNavigate, useParams } from 'react-router';
import { useApi } from '../useApi.ts';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import { RecipeForm } from '../components/RecipeForm.tsx';
import type { RecipeDetail, RecipeInput } from '../types.ts';

// The detail response and the form input have different shapes; convert between them.
function toInput(r: RecipeDetail): RecipeInput {
  return {
    name: r.name,
    emoji: r.emoji,
    category: r.category,
    servings: r.servings,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    description: r.description,
    visibility: r.visibility === 'public' ? 'public' : 'private',
    season: r.season,
    ingredients: r.ingredients.map(({ quantity, unit, ingredient }) => ({
      quantity,
      unit,
      ingredient,
    })),
    instructions: r.instructions.map((s) => s.instruction),
    tags: r.tags,
  };
}

export default function EditRecipePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, data: recipe, error, notFound } = useApi<RecipeDetail>(`/api/recipes/${id}`);

  if (!user) return <Navigate to="/login" replace />;
  if (loading) return <p className="status">Loading recipe…</p>;
  if (notFound || (recipe && recipe.user_id !== user.id)) {
    return <p className="status">You can only edit your own recipes.</p>;
  }
  if (error || !recipe) return <p className="status error">Couldn't load recipe: {error}</p>;

  async function handleSubmit(input: RecipeInput) {
    const result = await sendJson('PUT', `/api/recipes/${id}`, input);
    if (result.ok) navigate(`/recipes/${id}`);
    return { error: result.error, issues: result.issues };
  }

  return (
    <div className="form-page">
      <h1>Edit recipe</h1>
      <RecipeForm initial={toInput(recipe)} submitLabel="Save changes" onSubmit={handleSubmit} />
    </div>
  );
}
