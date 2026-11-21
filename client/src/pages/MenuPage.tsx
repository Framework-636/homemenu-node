import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import { duration, longDate, timeLocal, todayLocal } from '../dates.ts';
import type { Meal, Menu, MenuPick } from '../types.ts';

// The four menus of the day: the word on each tab, and the card's heading.
const MEALS: { value: Meal; tab: string; heading: string }[] = [
  { value: 'breakfast', tab: 'Breakfast', heading: "This morning's menu" },
  { value: 'lunch', tab: 'Lunch', heading: "Today's lunch" },
  { value: 'dinner', tab: 'Dinner', heading: "Tonight's menu" },
  { value: 'snack', tab: 'Snacks', heading: 'Late-night snacks' },
];

// Which menu fits the clock. The hour runs from 0 (midnight) to 23.
function mealForHour(hour: number): Meal {
  if (hour < 5) return 'snack'; // still last night
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

// What each slot is called on the card.
const SLOT_LABELS: Record<MenuPick['slot'], string> = {
  safe: 'The usual',
  medium: 'An old friend',
  new: 'Something new',
};

export default function MenuPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <TonightsMenu />;
}

function TonightsMenu() {
  const { sessionExpired } = useAuth();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meal, setMeal] = useState<Meal>(() => mealForHour(new Date().getHours()));
  const [roll, setRoll] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      const res = await fetch(
        `/api/menu?meal=${meal}&date=${todayLocal()}&time=${timeLocal()}&roll=${roll}`
      );
      if (ignore) return;
      if (res.status === 401) {
        sessionExpired();
        return;
      }
      if (!res.ok) {
        setError("Could not load tonight's menu.");
        return;
      }
      const data = (await res.json()) as Menu;
      if (!ignore) setMenu(data);
    })();
    return () => {
      ignore = true;
    };
  }, [meal, roll, reloadKey, sessionExpired]);

  // Snooze and bring-back are the same four beats: clear the old error,
  // send the request, handle the two ways it can fail, reload the menu.
  async function send(method: 'POST' | 'DELETE', url: string, body?: unknown) {
    setError(null);
    const res = await sendJson(method, url, body);
    if (res.status === 401) {
      sessionExpired();
      return;
    }
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReloadKey((k) => k + 1);
  }

  const snooze = (id: number) =>
    send('POST', '/api/menu/snooze', { recipe_id: id, date: todayLocal() });
  const bringBack = (id: number) => send('DELETE', `/api/menu/snooze/${id}`);

  if (menu === null) {
    return error ? <p className="status error">{error}</p> : <p className="status">Loading…</p>;
  }

  const heading = MEALS.find((m) => m.value === menu.meal)?.heading ?? 'Menu';

  return (
    <>
      <div className="recipe-filters menu-tabs" role="group" aria-label="Which menu to show">
        {MEALS.map(({ value, tab }) => (
          <button
            key={value}
            type="button"
            className={meal === value ? 'filter-chip active' : 'filter-chip'}
            aria-pressed={meal === value}
            onClick={() => {
              setMeal(value);
              setRoll(0); // a different menu starts from its first roll
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <section className="menu">
        <p className="menu-date">{longDate(menu.date)}</p>
        <h1>{heading}</h1>
        {menu.max_minutes !== null && (
          <p className="menu-note">Ready in {duration(menu.max_minutes)} or less</p>
        )}
        {error && <p className="status error">{error}</p>}

        {menu.picks.length === 0 && <p className="status">Nothing to suggest right now.</p>}
        <ul className="menu-picks">
          {menu.picks.map((pick) => (
            <li key={pick.slot}>
              <p className="menu-slot">{SLOT_LABELS[pick.slot]}</p>
              <Link to={`/recipes/${pick.recipe.id}`} className="menu-dish">
                {pick.recipe.emoji} {pick.recipe.name}
              </Link>
              <p className="menu-reason">{pick.reason}</p>
              <p className="menu-meta">
                {pick.recipe.prep_time + pick.recipe.cook_time} min · serves {pick.recipe.servings}
              </p>
              <button type="button" className="snooze" onClick={() => void snooze(pick.recipe.id)}>
                Not this week
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="reroll" onClick={() => setRoll((r) => r + 1)}>
          Show me something else
        </button>
        {menu.snoozed.length > 0 && (
          <div className="menu-snoozed">
            <h2>Off the menu this week</h2>
            <ul>
              {menu.snoozed.map((recipe) => (
                <li key={recipe.id}>
                  {recipe.emoji} {recipe.name}{' '}
                  <button type="button" onClick={() => void bringBack(recipe.id)}>
                    Bring back
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
