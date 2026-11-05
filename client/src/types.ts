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
