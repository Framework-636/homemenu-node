// The shape of a recipe in the list, as the API sends it
export interface RecipeSummary {
  id: number;
  name: string;
  emoji: string;
  category: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  season: string;
  last_made: string | null;
}

export interface Ingredient {
  quantity: string;
  unit: string;
  ingredient: string;
  ingredient_id: number | null;
}

export interface Instruction {
  step_number: number;
  instruction: string;
}

// A full recipe from GET /api/recipes/:id
export interface RecipeDetail extends RecipeSummary {
  description: string | null;
  visibility: 'private' | 'public';
  created_at: string;
  updated_at: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
}
