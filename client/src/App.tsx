import { Link, Route, Routes } from 'react-router';
import RecipeListPage from './pages/RecipeListPage.tsx';
import RecipeDetailPage from './pages/RecipeDetailPage.tsx';
import './App.css';

export default function App() {
  return (
    <main className="page">
      <header>
        <Link to="/" className="brand">
          HomeMenu
        </Link>
      </header>

      <Routes>
        <Route path="/" element={<RecipeListPage />} />
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
        <Route path="*" element={<p className="status">Page not found.</p>} />
      </Routes>
    </main>
  );
}
