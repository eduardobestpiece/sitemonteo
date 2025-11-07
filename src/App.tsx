import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EventLandingPage from './pages/EventLandingPage';
import EventThankYou from './pages/EventThankYou';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EventLandingPage />} />
        <Route path="/obrigado" element={<EventThankYou />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

