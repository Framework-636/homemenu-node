import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext.ts';
import { sendJson } from '../api.ts';
import { duration, longDate, timeLocal, todayLocal } from '../dates.ts';
import type { Menu, MenuPick } from '../types.ts';

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
  const [roll, setRoll] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      const res = await fetch(
        `/api/menu?meal=dinner&date=${todayLocal()}&time=${timeLocal()}&roll=${roll}`
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
  }, [roll, reloadKey, sessionExpired]);

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

  return (
    <section className="menu">
      <p className="menu-date">{longDate(menu.date)}</p>
      <h1>Tonight's menu</h1>
      {menu.max_minutes !== null && (
        <p className="menu-note">Ready in {duration(menu.max_minutes)} or less</p>
      )}
      {error && <p className="status error">{error}</p>}

      {menu.picks.length === 0 && <p className="status">Nothing left to suggest tonight.</p>}
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
  );
}
