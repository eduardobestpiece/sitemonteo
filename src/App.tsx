import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Code splitting - carregar páginas sob demanda
const EventLandingPage = lazy(() => import('./pages/EventLandingPage'));
const EventThankYou = lazy(() => import('./pages/EventThankYou'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));

// Componente de loading simples
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#131313' }}>
    <div className="text-white">Carregando...</div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<EventLandingPage />} />
            <Route path="/obrigado" element={<EventThankYou />} />
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/configuracoes" 
              element={
                <ProtectedRoute>
                  <ConfiguracoesPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

