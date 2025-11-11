import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import EventLandingPage from './pages/EventLandingPage';
import EventThankYou from './pages/EventThankYou';
import LoginPage from './pages/LoginPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

