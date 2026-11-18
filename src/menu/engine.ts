// The menu engine: given what a household could cook, pick three.
//
// This file has no database and no clock in it. Everything it needs is passed
// in, and the only "randomness" comes from a seed, so the same inputs always
// give the same menu. That is what makes it testable, and what keeps tonight's
// menu the same every time the page is opened.

export type Slot = 'safe' | 'medium' | 'new';

// One recipe the user is allowed to be offered, with what we know about it.
export interface Candidate {
  id: number;
  isOwn: boolean; // the user wrote it
  timesCooked: number; // by this user
  lastMade: string | null; // 'YYYY-MM-DD', by this user
  linkedIngredients: number; // ingredients tied to the catalog
  knownIngredients: number; // of those, how many this household already uses
}

export interface Pick {
  slot: Slot;
  recipeId: number;
  reason: string; // one line for the page: why this is on tonight's menu
}

export interface MenuInput {
  candidates: Candidate[];
  date: string; // 'YYYY-MM-DD': the day the menu is for
  seed: string; // same seed, same menu
  roll: number; // 0 = the day's first menu; each re-roll adds 1
}

// Cooked this many times or more: a regular.
export const SAFE_MIN_COOKS = 3;
// Cooked within this many days: too soon to suggest again.
export const RECENT_DAYS = 7;
// A new recipe counts as "from familiar ingredients" at this share or above.
export const FAMILIAR_SHARE = 0.5;

const SLOTS: Slot[] = ['safe', 'medium', 'new'];

// ---------- Seeded randomness ----------

// Turn any text into a 32-bit number (FNV-1a hash).
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// A small random-number generator (mulberry32). Unlike Math.random(), it starts
// from a seed, so the sequence of numbers it gives is the same every time.
function seededRandom(seed: string): () => number {
  let state = hash(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0 up to (not including) 1
  };
}

// Shuffle, but heavier items tend to land nearer the front.
// Each item draws a random number and raises it to 1/weight; sorting by that
// puts a weight-5 item ahead of a weight-1 item most of the time, not always.
function weightedShuffle<T>(items: T[], weight: (item: T) => number, seed: string): T[] {
  const random = seededRandom(seed);
  return items
    .map((item) => ({ item, key: Math.pow(random(), 1 / Math.max(weight(item), 0.01)) }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.item);
}

// ---------- Sorting recipes into tiers ----------

function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);
}

export function cookedRecently(candidate: Candidate, date: string): boolean {
  return candidate.lastMade !== null && daysBetween(candidate.lastMade, date) < RECENT_DAYS;
}

// Share of a recipe's ingredients this household already uses (0 to 1).
// A recipe with no catalog-linked ingredients can't be judged, so it scores 0.
export function familiarity(candidate: Candidate): number {
  if (candidate.linkedIngredients === 0) return 0;
  return candidate.knownIngredients / candidate.linkedIngredients;
}

// safe:   a regular (cooked 3+ times)
// medium: known but not a regular (cooked once or twice, or your own recipe not made yet)
// new:    someone else's recipe you have never cooked
export function tierOf(candidate: Candidate): Slot {
  if (candidate.timesCooked >= SAFE_MIN_COOKS) return 'safe';
  if (candidate.timesCooked > 0 || candidate.isOwn) return 'medium';
  return 'new';
}

function reasonFor(candidate: Candidate): string {
  const { timesCooked, isOwn, linkedIngredients, knownIngredients } = candidate;
  if (timesCooked >= SAFE_MIN_COOKS) return `A regular: you've made this ${timesCooked} times`;
  if (timesCooked === 2) return "You've made this twice";
  if (timesCooked === 1) return "You've made this once";
  if (isOwn) return "Your recipe, and you haven't made it yet";
  if (knownIngredients > 0) {
    return `New to you, and you already use ${knownIngredients} of its ${linkedIngredients} ingredients`;
  }
  return 'New to you';
}

// How strongly each tier leans toward its best members.
const WEIGHTS: Record<Slot, (c: Candidate) => number> = {
  safe: (c) => c.timesCooked, // the more often you make it, the more often it shows
  medium: () => 1, // no favorites
  new: (c) => 0.1 + familiarity(c), // lean toward the most familiar
};

// ---------- Building the menu ----------

// Up to three picks, one per slot, never the same recipe twice.
// Recipes cooked in the last week are left out.
export function buildMenu({ candidates, date, seed, roll }: MenuInput): Pick[] {
  // Sort by id first so the result never depends on the order the database returned rows in.
  const pool = candidates.filter((c) => !cookedRecently(c, date)).sort((a, b) => a.id - b.id);

  const tiers: Record<Slot, Candidate[]> = { safe: [], medium: [], new: [] };
  for (const candidate of pool) tiers[tierOf(candidate)].push(candidate);

  // "Something new" should come from familiar ingredients. Only if nothing
  // qualifies do the unfamiliar ones get a turn, so the slot isn't left empty.
  const familiar = tiers.new.filter((c) => familiarity(c) >= FAMILIAR_SHARE);
  if (familiar.length > 0) tiers.new = familiar;

  // Each tier gets one shuffled order for the day. Re-rolling walks along it,
  // so roll 1 always shows something different from roll 0 when there is a choice.
  const order: Record<Slot, Candidate[]> = {
    safe: weightedShuffle(tiers.safe, WEIGHTS.safe, `${seed}|safe`),
    medium: weightedShuffle(tiers.medium, WEIGHTS.medium, `${seed}|medium`),
    new: weightedShuffle(tiers.new, WEIGHTS.new, `${seed}|new`),
  };

  const picks: Pick[] = [];
  const used = new Set<number>();

  for (const slot of SLOTS) {
    const list = order[slot];
    if (list.length === 0) continue;
    const choice = list[roll % list.length]!;
    used.add(choice.id);
    picks.push({ slot, recipeId: choice.id, reason: reasonFor(choice) });
  }

  // A newer household may have no regulars yet (or nothing new left to try).
  // Fill any empty slot from what's left, closest tier first, so the menu still has three.
  for (const slot of SLOTS) {
    if (picks.some((p) => p.slot === slot)) continue;
    const spare = SLOTS.flatMap((other) => order[other]).filter((c) => !used.has(c.id));
    if (spare.length === 0) continue;
    const choice = spare[roll % spare.length]!;
    used.add(choice.id);
    picks.push({ slot, recipeId: choice.id, reason: reasonFor(choice) });
  }

  return picks.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
}
