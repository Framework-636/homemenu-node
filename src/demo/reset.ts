// Puts one account back to a known state. Used by the nightly demo reset.
//
// It only ever touches data that belongs to the account it is given:
//   - the account's own lists and history are cleared and re-created
//   - recipes the account created during the day are removed
//   - recipes from the seed data are restored in place (same row, same id), so
//     other people's bookmarks and cook logs for them survive
// Nothing owned by any other account is changed or deleted, with one exception:
// a seed recipe is found by its key, so if the seed data moves it to this account
// it changes owner here (that is how the showcase moved to the library account).
import type { PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface SeedRecipe {
  key: string; // stable name for this recipe in the seed data (recipes.seed_key)
  name: string;
  emoji: string;
  category: 'Dinner' | 'Lunch' | 'Breakfast' | 'Dessert' | 'Snack' | 'Soup' | 'Baking' | 'Other';
  servings: number;
  prep_time: number;
  cook_time: number;
  description: string | null;
  visibility: 'private' | 'public';
  season: 'any' | 'spring' | 'summer' | 'fall' | 'winter';
  tags: string[];
  ingredients: { quantity: string; unit: string; ingredient: string; slug?: string }[];
  steps: string[];
}

export interface SeedData {
  recipes: SeedRecipe[];
  staples: { slug: string; inStock: boolean }[];
  avoids: string[]; // ingredient slugs
  grocery: string[]; // extra items typed onto the grocery list
  // Cooking history, counted back from today. The recipe (found by its key) can be anyone's.
  cooked: { key: string; daysAgo: number[] }[];
  saved: string[]; // keys of other people's recipes this account has bookmarked
}

export interface ResetSummary {
  recipesRestored: number;
  recipesAdded: number;
  recipesRemoved: number;
}

// Tables holding one account's own lists and history, each with a user_id column.
const PERSONAL_TABLES = [
  'cook_log',
  'recipe_snoozes',
  'saved_recipes',
  'kitchen_items',
  'avoided_ingredients',
  'grocery_items',
  'meal_plan',
] as const;

// Reset one account to `data`. `today` is 'YYYY-MM-DD'; cooking history counts back from it.
// Runs inside a transaction: if anything fails, the account is left exactly as it was.
export async function resetAccount(
  conn: PoolConnection,
  userId: number,
  data: SeedData,
  today: string
): Promise<ResetSummary> {
  const summary: ResetSummary = { recipesRestored: 0, recipesAdded: 0, recipesRemoved: 0 };

  await conn.beginTransaction();
  try {
    // Catalog ingredients by slug, to link recipe lines, staples and avoids.
    const [catalog] = await conn.query<RowDataPacket[]>(
      'SELECT id, slug FROM ingredients WHERE created_by IS NULL'
    );
    const ingredientId = new Map(catalog.map((row) => [row.slug as string, row.id as number]));
    const idFor = (slug: string): number => {
      const id = ingredientId.get(slug);
      if (id === undefined) throw new Error(`Seed data names an unknown ingredient: ${slug}`);
      return id;
    };

    // 1. Clear the account's own lists and history.
    for (const table of PERSONAL_TABLES) {
      await conn.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }

    // 2. Remove the account's recipes that aren't part of the seed data.
    const keys = data.recipes.map((r) => r.key);
    const [removed] = await conn.query<ResultSetHeader>(
      keys.length > 0
        ? 'DELETE FROM recipes WHERE user_id = ? AND (seed_key IS NULL OR seed_key NOT IN (?))'
        : 'DELETE FROM recipes WHERE user_id = ?',
      [userId, keys]
    );
    summary.recipesRemoved = removed.affectedRows;

    // 3. Restore each seed recipe in place, or add it if it's missing.
    for (const recipe of data.recipes) {
      const fields = [
        recipe.name,
        recipe.emoji,
        recipe.category,
        recipe.servings,
        recipe.prep_time,
        recipe.cook_time,
        recipe.description,
        recipe.visibility,
        recipe.season,
      ];
      // Found by key alone: the row keeps its id even when the seed data gives it a new owner.
      const [existing] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM recipes WHERE seed_key = ?',
        [recipe.key]
      );

      let recipeId: number;
      if (existing[0]) {
        recipeId = existing[0].id as number;
        await conn.query(
          `UPDATE recipes
              SET name = ?, emoji = ?, category = ?, servings = ?, prep_time = ?, cook_time = ?,
                  description = ?, visibility = ?, season = ?, user_id = ?
            WHERE id = ?`,
          [...fields, userId, recipeId]
        );
        summary.recipesRestored++;
      } else {
        const [inserted] = await conn.query<ResultSetHeader>(
          `INSERT INTO recipes
             (name, emoji, category, servings, prep_time, cook_time, description, visibility, season,
              user_id, seed_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [...fields, userId, recipe.key]
        );
        recipeId = inserted.insertId;
        summary.recipesAdded++;
      }

      // Replace the recipe's ingredients, steps and tags with the seed's.
      await conn.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
      await conn.query('DELETE FROM recipe_instructions WHERE recipe_id = ?', [recipeId]);
      await conn.query('DELETE FROM recipe_tags WHERE recipe_id = ?', [recipeId]);
      if (recipe.ingredients.length > 0) {
        await conn.query(
          `INSERT INTO recipe_ingredients
             (recipe_id, sort_order, quantity, unit, ingredient, ingredient_id) VALUES ?`,
          [
            recipe.ingredients.map((line, i) => [
              recipeId,
              i + 1,
              line.quantity,
              line.unit,
              line.ingredient,
              line.slug ? idFor(line.slug) : null,
            ]),
          ]
        );
      }
      if (recipe.steps.length > 0) {
        await conn.query(
          'INSERT INTO recipe_instructions (recipe_id, step_number, instruction) VALUES ?',
          [recipe.steps.map((text, i) => [recipeId, i + 1, text])]
        );
      }
      if (recipe.tags.length > 0) {
        await conn.query('INSERT INTO recipe_tags (recipe_id, tag) VALUES ?', [
          recipe.tags.map((tag) => [recipeId, tag]),
        ]);
      }
    }

    // 4. Cooking history and bookmarks. These can point at anyone's seed recipes.
    const recipeIdFor = async (key: string): Promise<number> => {
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM recipes WHERE seed_key = ?',
        [key]
      );
      const id = rows[0]?.id as number | undefined;
      if (id === undefined) throw new Error(`Seed data names an unknown recipe: ${key}`);
      return id;
    };
    for (const { key, daysAgo } of data.cooked) {
      const recipeId = await recipeIdFor(key);
      for (const days of daysAgo) {
        await conn.query(
          `INSERT INTO cook_log (user_id, recipe_id, cooked_on)
           VALUES (?, ?, DATE_SUB(?, INTERVAL ? DAY))`,
          [userId, recipeId, today, days]
        );
      }
    }
    for (const key of data.saved) {
      await conn.query('INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)', [
        userId,
        await recipeIdFor(key),
      ]);
    }

    // 5. Staples, avoid list and grocery extras.
    for (const staple of data.staples) {
      await conn.query(
        "INSERT INTO kitchen_items (user_id, ingredient_id, kind, in_stock) VALUES (?, ?, 'staple', ?)",
        [userId, idFor(staple.slug), staple.inStock ? 1 : 0]
      );
    }
    for (const slug of data.avoids) {
      await conn.query('INSERT INTO avoided_ingredients (user_id, ingredient_id) VALUES (?, ?)', [
        userId,
        idFor(slug),
      ]);
    }
    for (const name of data.grocery) {
      await conn.query(
        "INSERT INTO grocery_items (user_id, name, category) VALUES (?, ?, 'Other')",
        [userId, name]
      );
    }

    await conn.commit();
    return summary;
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}
