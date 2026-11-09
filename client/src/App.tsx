import { Link, Route, Routes } from 'react-router';
import RecipeListPage from './pages/RecipeListPage.tsx';
import RecipeDetailPage from './pages/RecipeDetailPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import { useAuth } from './auth/AuthContext.ts';
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
          <Route path="/" element={<RecipeListPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p className="status">Page not found.</p>} />
        </Routes>
      )}
    </main>
  );
}
