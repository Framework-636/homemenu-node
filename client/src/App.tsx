import { Link, Route, Routes } from 'react-router';
import RecipeListPage from './pages/RecipeListPage.tsx';
import RecipeDetailPage from './pages/RecipeDetailPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import { useAuth } from './auth/AuthContext.ts';
import NewRecipePage from './pages/NewRecipePage.tsx';
import EditRecipePage from './pages/EditRecipePage.tsx';
import StaplesPage from './pages/StaplesPage.tsx';
import AvoidPage from './pages/AvoidPage.tsx';
import GroceryPage from './pages/GroceryPage.tsx';
import MenuPage from './pages/MenuPage.tsx';
import './App.css';

export default function App() {
  const { user, checking, logout } = useAuth();

  return (
    <main className="page">
      <header className="site-header">
        <Link to="/" className="brand">
          HomeMenu
        </Link>
        <nav className="user-nav">
          {checking ? null : user ? (
            <>
              <Link to="/">Menu</Link>
              <Link to="/recipes">Recipes</Link>
              <Link to="/grocery">Grocery</Link>
              <Link to="/staples">Staples</Link>
              <Link to="/avoid">Avoid</Link>
              <Link to="/recipes/new">+ New recipe</Link>
              <span>{user.display_name}</span>
              <button onClick={() => void logout()}>Log out</button>
            </>
          ) : (
            <Link to="/login">Log in</Link>
          )}
        </nav>
      </header>

      {checking ? (
        <p className="status">Loading…</p>
      ) : (
        <Routes key={user?.id ?? 'guest'}>
          {/* Home is the menu once you're logged in; guests browse recipes. */}
          <Route path="/" element={user ? <MenuPage /> : <RecipeListPage />} />
          <Route path="/recipes" element={<RecipeListPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p className="status">Page not found.</p>} />
          <Route path="/recipes/new" element={<NewRecipePage />} />
          <Route path="/recipes/:id/edit" element={<EditRecipePage />} />
          <Route path="/avoid" element={<AvoidPage />} />
          <Route path="/staples" element={<StaplesPage />} />
          <Route path="/grocery" element={<GroceryPage />} />
        </Routes>
      )}
    </main>
  );
}
