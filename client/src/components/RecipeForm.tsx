import { useState } from 'react';
import type { FieldIssue } from '../api.ts';
import type { RecipeInput, Visibility } from '../types.ts';

const CATEGORIES = ['Dinner', 'Lunch', 'Breakfast', 'Dessert', 'Snack', 'Soup', 'Baking', 'Other'];
const SEASONS = ['any', 'spring', 'summer', 'fall', 'winter'];

// Rows in the form get a stable key, so React can tell them apart
// when rows are added, removed or reordered.
interface IngredientRow {
  key: string;
  quantity: string;
  unit: string;
  ingredient: string;
}

interface StepRow {
  key: string;
  text: string;
}

// The form keeps numbers as text while you type ("" is allowed mid-edit).
interface FormState {
  name: string;
  emoji: string;
  category: string;
  servings: string;
  prep_time: string;
  cook_time: string;
  description: string;
  visibility: Visibility;
  season: string;
  ingredients: IngredientRow[];
  instructions: StepRow[];
  tags: string; // comma separated while editing
}

const newKey = () => crypto.randomUUID();
const blankIngredient = (): IngredientRow => ({
  key: newKey(),
  quantity: '',
  unit: '',
  ingredient: '',
});
const blankStep = (): StepRow => ({ key: newKey(), text: '' });

function toFormState(r: RecipeInput): FormState {
  return {
    name: r.name,
    emoji: r.emoji,
    category: r.category,
    servings: String(r.servings),
    prep_time: String(r.prep_time),
    cook_time: String(r.cook_time),
    description: r.description ?? '',
    visibility: r.visibility,
    season: r.season,
    ingredients: r.ingredients.length
      ? r.ingredients.map((i) => ({ key: newKey(), ...i }))
      : [blankIngredient()],
    instructions: r.instructions.length
      ? r.instructions.map((text) => ({ key: newKey(), text }))
      : [blankStep()],
    tags: r.tags.join(', '),
  };
}

// Convert what's on screen into what the API expects. Blank rows are dropped.
function toInput(f: FormState): RecipeInput {
  return {
    name: f.name,
    emoji: f.emoji || '🍽️',
    category: f.category,
    servings: Number(f.servings),
    prep_time: Number(f.prep_time) || 0,
    cook_time: Number(f.cook_time) || 0,
    description: f.description.trim() || null,
    visibility: f.visibility,
    season: f.season,
    ingredients: f.ingredients
      .filter((row) => row.ingredient.trim())
      .map(({ quantity, unit, ingredient }) => ({ quantity, unit, ingredient })),
    instructions: f.instructions.map((s) => s.text).filter((text) => text.trim()),
    tags: f.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

interface RecipeFormProps {
  initial: RecipeInput;
  submitLabel: string;
  // The page does the saving; it returns errors to show, or navigates away on success.
  onSubmit: (input: RecipeInput) => Promise<{ error: string | null; issues: FieldIssue[] }>;
}

export function RecipeForm({ initial, submitLabel, onSubmit }: RecipeFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<FieldIssue[]>([]);

  // Change one top-level field, keeping everything else.
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ---- Ingredient rows ----
  function updateIngredient(key: string, field: 'quantity' | 'unit' | 'ingredient', value: string) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    }));
  }
  function addIngredient() {
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, blankIngredient()] }));
  }
  function removeIngredient(key: string) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((row) => row.key !== key) }));
  }

  // ---- Step rows ----
  function updateStep(key: string, text: string) {
    setForm((f) => ({
      ...f,
      instructions: f.instructions.map((s) => (s.key === key ? { ...s, text } : s)),
    }));
  }
  function addStep() {
    setForm((f) => ({ ...f, instructions: [...f.instructions, blankStep()] }));
  }
  function removeStep(key: string) {
    setForm((f) => ({ ...f, instructions: f.instructions.filter((s) => s.key !== key) }));
  }
  function moveStep(index: number, direction: -1 | 1) {
    setForm((f) => {
      const target = index + direction;
      if (target < 0 || target >= f.instructions.length) return f;
      const steps = [...f.instructions];
      [steps[index], steps[target]] = [steps[target], steps[index]]; // swap
      return { ...f, instructions: steps };
    });
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setIssues([]);
    const result = await onSubmit(toInput(form));
    setSaving(false);
    setError(result.error);
    setIssues(result.issues);
  }

  const nameError = issues.find((i) => i.path === 'name')?.message;

  return (
    <form
      className="recipe-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {(error || issues.length > 0) && (
        <div className="form-errors" role="alert">
          <p>{error ?? 'Please fix the following:'}</p>
          {issues.length > 0 && (
            <ul>
              {issues.map((i) => (
                <li key={i.path + i.message}>
                  <code>{i.path}</code>: {i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="form-row">
        <label className="field emoji-field">
          Emoji
          <input
            value={form.emoji}
            onChange={(e) => setField('emoji', e.target.value)}
            maxLength={8}
          />
        </label>
        <label className="field grow">
          Name
          <input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            required
            maxLength={160}
          />
          {nameError && <span className="field-error">{nameError}</span>}
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          Category
          <select value={form.category} onChange={(e) => setField('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Season
          <select value={form.season} onChange={(e) => setField('season', e.target.value)}>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s === 'any' ? 'Any season' : s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Visibility
          <select
            value={form.visibility}
            onChange={(e) => setField('visibility', e.target.value as Visibility)}
          >
            <option value="private">Private (only me)</option>
            <option value="public">Public</option>
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          Servings
          <input
            type="number"
            min={1}
            max={100}
            value={form.servings}
            onChange={(e) => setField('servings', e.target.value)}
            required
          />
        </label>
        <label className="field">
          Prep (min)
          <input
            type="number"
            min={0}
            max={2880}
            value={form.prep_time}
            onChange={(e) => setField('prep_time', e.target.value)}
          />
        </label>
        <label className="field">
          Cook (min)
          <input
            type="number"
            min={0}
            max={2880}
            value={form.cook_time}
            onChange={(e) => setField('cook_time', e.target.value)}
          />
        </label>
      </div>

      <label className="field">
        Description
        <textarea
          rows={2}
          maxLength={2000}
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
        />
      </label>

      <fieldset>
        <legend>Ingredients</legend>
        {form.ingredients.map((row) => (
          <div className="list-row" key={row.key}>
            <input
              className="qty"
              placeholder="Qty"
              aria-label="Quantity"
              maxLength={30}
              value={row.quantity}
              onChange={(e) => updateIngredient(row.key, 'quantity', e.target.value)}
            />
            <input
              className="unit"
              placeholder="Unit"
              aria-label="Unit"
              maxLength={30}
              value={row.unit}
              onChange={(e) => updateIngredient(row.key, 'unit', e.target.value)}
            />
            <input
              className="grow"
              placeholder="Ingredient"
              aria-label="Ingredient"
              maxLength={160}
              value={row.ingredient}
              onChange={(e) => updateIngredient(row.key, 'ingredient', e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label="Remove ingredient"
              onClick={() => removeIngredient(row.key)}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={addIngredient}>
          + Add ingredient
        </button>
      </fieldset>

      <fieldset>
        <legend>Steps</legend>
        {form.instructions.map((step, index) => (
          <div className="list-row" key={step.key}>
            <span className="step-number">{index + 1}</span>
            <textarea
              className="grow"
              rows={2}
              maxLength={2000}
              aria-label={`Step ${index + 1}`}
              value={step.text}
              onChange={(e) => updateStep(step.key, e.target.value)}
            />
            <div className="step-buttons">
              <button
                type="button"
                className="icon-btn"
                aria-label="Move step up"
                disabled={index === 0}
                onClick={() => moveStep(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Move step down"
                disabled={index === form.instructions.length - 1}
                onClick={() => moveStep(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Remove step"
                onClick={() => removeStep(step.key)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="add-btn" onClick={addStep}>
          + Add step
        </button>
      </fieldset>

      <label className="field">
        <span>
          Tags <span className="hint">(comma separated)</span>
        </span>
        <input
          value={form.tags}
          onChange={(e) => setField('tags', e.target.value)}
          placeholder="weeknight, one-pan"
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
