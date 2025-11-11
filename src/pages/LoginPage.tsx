import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha incorretos');
      setLoading(false);
    } else {
      navigate('/configuracoes');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#131313' }}>
      <div 
        className="rounded-lg overflow-hidden w-full max-w-md mx-4"
        style={{
          background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))',
          padding: '0.5px',
          boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
        }}
      >
        <div 
          className="rounded-lg p-8"
          style={{
            background: 'linear-gradient(180deg, #131313, #1E1E1E)',
            border: '1px solid #A87056'
          }}
        >
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lpsicad/imagens/Logo-Monteo.png"
              alt="Monteo Investimentos"
              style={{ width: '120px', height: 'auto' }}
            />
          </div>

          <h1 className="text-white text-center mb-8" style={{ fontSize: '20px', fontWeight: 500 }}>
            Acesse as configurações da página
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A87056';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#353535';
                }}
                required
                className="w-full px-4 py-3 rounded-lg text-white transition-colors duration-200"
                style={{
                  backgroundColor: '#2A2A2A',
                  border: '1px solid #353535',
                  outline: 'none'
                }}
                placeholder="Digite o seu email"
              />
            </div>

            <div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A87056';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#353535';
                }}
                required
                className="w-full px-4 py-3 rounded-lg text-white transition-colors duration-200"
                style={{
                  backgroundColor: '#2A2A2A',
                  border: '1px solid #353535',
                  outline: 'none'
                }}
                placeholder="Informe a senha"
              />
            </div>

            {error && (
              <div 
                className="p-3 rounded-lg text-center text-white text-sm"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)', border: '1px solid #dc2626' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#A87056',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

