import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, AlertCircle, MousePointerClick } from "lucide-react";

// URL do WhatsApp - será definida depois
const WHATSAPP_URL = 'https://wa.me/5511999999999'; // TODO: Atualizar com a URL real

export default function EventThankYou() {
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [whatsappUrl, setWhatsappUrl] = useState<string>(WHATSAPP_URL);

  // Função para calcular a cor da barra de progresso (vermelho -> amarelo)
  const getProgressColor = (progressValue: number, alpha?: number) => {
    const redStart = 220;
    const redEnd = 251;
    const greenStart = 38;
    const greenEnd = 191;
    const blueStart = 38;
    const blueEnd = 36;

    const ratio = progressValue / 80;
    
    const r = Math.round(redStart + (redEnd - redStart) * ratio);
    const g = Math.round(greenStart + (greenEnd - greenStart) * ratio);
    const b = Math.round(blueStart + (blueEnd - blueStart) * ratio);

    if (alpha !== undefined) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Capturar nome da URL ou localStorage
  useEffect(() => {
    const nameFromUrl = searchParams.get('nome') || searchParams.get('name') || searchParams.get('firstName');
    
    if (nameFromUrl) {
      const first = nameFromUrl.trim().split(' ')[0];
      setFirstName(first);
    } else {
      try {
        const leadData = localStorage.getItem('leadData');
        const formData = localStorage.getItem('formData');
        const savedData = leadData || formData;
        
        if (savedData) {
          const data = JSON.parse(savedData);
          const fullName = data.nome || data.name || data.firstName || data.first_name || '';
          if (fullName) {
            const first = fullName.trim().split(' ')[0];
            setFirstName(first);
          }
        }
      } catch (error) {
        console.error('Erro ao ler localStorage:', error);
      }
    }

    // Buscar URL do WhatsApp (prioridade: URL params > fixo)
    const whatsappFromUrl = searchParams.get('whatsapp') || searchParams.get('whatsapp_url');
    if (whatsappFromUrl) {
      setWhatsappUrl(whatsappFromUrl);
    } else {
      setWhatsappUrl(WHATSAPP_URL);
    }
  }, [searchParams]);

  // Animar barra de progresso até 80%
  useEffect(() => {
    const duration = 2000;
    const steps = 80;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 80, 80);
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#131313' }}>
      <div 
        className="rounded-lg transition-transform duration-300 w-full max-w-2xl"
        style={{
          background: 'linear-gradient(180deg, #A87056, #353535)',
          padding: '0.5px',
          boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
        }}
      >
        <div 
          className="rounded-lg p-6 lg:p-8"
          style={{
            background: 'linear-gradient(180deg, #131313, #1E1E1E)'
          }}
        >
          <h2 className="text-white text-2xl lg:text-3xl font-bold text-center mb-8">
            {firstName ? `${firstName}, quase tudo pronto` : 'Quase tudo pronto'}
          </h2>

          <div className="mb-8">
            <div 
              className="h-3 rounded-full overflow-hidden"
              style={{
                backgroundColor: '#2a2a2a'
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getProgressColor(progress),
                  boxShadow: `0 0 10px ${getProgressColor(progress, 0.5)}`
                }}
              />
            </div>
          </div>

          <p className="text-white text-base lg:text-lg mb-6 text-center">
            Eu te mandei uma mensagem no seu WhatsApp com essas orientações:
          </p>

          <ul className="text-white text-base lg:text-lg mb-8 space-y-3">
            <li className="flex items-start">
              <Calendar className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#A87056' }} />
              <span>Aceite o convite para o evento que enviamos no seu e-mail</span>
            </li>
            <li className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#A87056' }} />
              <span>Esteja atento aos avisos na comunidade</span>
            </li>
            <li className="flex items-start">
              <MousePointerClick className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#A87056' }} />
              <span>Acesse a comunidade no WhatsApp clicando no botão abaixo</span>
            </li>
          </ul>

          <div className="flex justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300 hover:opacity-90"
              style={{
                backgroundColor: '#25D366',
                animation: 'pulse 2s ease-in-out infinite',
                fontSize: '18px',
                boxShadow: '0 0 20px rgba(37, 211, 102, 0.6), 0 0 40px rgba(37, 211, 102, 0.4)'
              }}
            >
              <img 
                src="/lpsicad/imagens/Logo whatsapp.svg" 
                alt="WhatsApp" 
                className="h-6 w-6"
                style={{ 
                  filter: 'brightness(0) invert(1)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                }}
              />
              <span style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                Acessar Comunidade
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

