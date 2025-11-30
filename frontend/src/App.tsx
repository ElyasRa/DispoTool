import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Disposition from './pages/Disposition';
import Dashboard from './pages/Dashboard';
import Anfragen from './pages/Anfragen';
import NeuerAuftrag from './pages/NeuerAuftrag';
import Auftragsverwaltung from './pages/Auftragsverwaltung';
import OffeneAuftraege from './pages/OffeneAuftraege';
import AbrechnungErstellen from './pages/AbrechnungErstellen';
import OffeneRechnungen from './pages/OffeneRechnungen';
import Mahnwesen from './pages/Mahnwesen';
import Monteurverwaltung from './pages/Monteurverwaltung';
import Benutzerverwaltung from './pages/Benutzerverwaltung';
import Einstellungen from './pages/Einstellungen';
import Layout from './components/Layout';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
}

interface ProtectedRouteProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

function ProtectedRoute({ children, isAuthenticated }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Validate user object structure
        if (parsedUser && typeof parsedUser.id === 'number' && typeof parsedUser.username === 'string') {
          setToken(savedToken);
          setUser(parsedUser);
        } else {
          // Invalid user data, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {
        // Invalid JSON, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!token;

  // Helper component to wrap pages with Layout
  const withLayout = (Component: React.ComponentType) => (
    <Layout user={user} onLogout={handleLogout}>
      <Component />
    </Layout>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Dashboard)}
            </ProtectedRoute>
          }
        />

        {/* AUFTRÄGE */}
        <Route
          path="/anfragen"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Anfragen)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/neuer-auftrag"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(NeuerAuftrag)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/disposition"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Disposition />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auftragsverwaltung"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Auftragsverwaltung)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/offene-auftraege"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(OffeneAuftraege)}
            </ProtectedRoute>
          }
        />

        {/* FINANZEN */}
        <Route
          path="/abrechnung-erstellen"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(AbrechnungErstellen)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/offene-rechnungen"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(OffeneRechnungen)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/mahnwesen"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Mahnwesen)}
            </ProtectedRoute>
          }
        />

        {/* VERWALTUNG */}
        <Route
          path="/monteurverwaltung"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Monteurverwaltung)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/benutzerverwaltung"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Benutzerverwaltung)}
            </ProtectedRoute>
          }
        />
        <Route
          path="/einstellungen"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {withLayout(Einstellungen)}
            </ProtectedRoute>
          }
        />

        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={handleAuth} />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Register onRegister={handleAuth} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
