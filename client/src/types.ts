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
  visibility: Visibility;
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
  user_id: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tags: string[];
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
}

export type Visibility = 'private' | 'public';

// What the API accepts when creating or updating a recipe.
export interface RecipeInput {
  name: string;
  emoji: string;
  category: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  description: string | null;
  visibility: Visibility;
  season: string;
  ingredients: { quantity: string; unit: string; ingredient: string }[];
  instructions: string[];
  tags: string[];
}
