import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import { RecipeForm } from '../components/RecipeForm.tsx';
import type { RecipeInput } from '../types.ts';

const EMPTY_RECIPE: RecipeInput = {
  name: '',
  emoji: '🍽️',
  category: 'Dinner',
  servings: 4,
  prep_time: 0,
  cook_time: 0,
  description: null,
  visibility: 'private',
  season: 'any',
  ingredients: [],
  instructions: [],
  tags: [],
};

export default function NewRecipePage() {
  const { user, sessionExpired } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  async function handleSubmit(input: RecipeInput) {
    const result = await sendJson<{ id: number }>('POST', '/api/recipes', input);
    if (result.status === 401) sessionExpired();
    if (result.ok && result.data) {
      navigate(`/recipes/${result.data.id}`); // go see the new recipe
    }
    return { error: result.error, issues: result.issues };
  }

  return (
    <div className="form-page">
      <h1>New recipe</h1>
      <RecipeForm initial={EMPTY_RECIPE} submitLabel="Create recipe" onSubmit={handleSubmit} />
    </div>
  );
}
