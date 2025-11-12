import { Calendar, ChevronDown, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { usePixels } from "../hooks/usePixels";
import { useFormIframe } from "../hooks/useFormIframe";
import { useEventSettings } from "../hooks/useEventSettings";

// Data padrão (fallback)
const DEFAULT_EVENT_DATE = new Date(2025, 10, 19, 19, 0, 0); // Mês 10 = Novembro (0-indexed)
const DEFAULT_EVENT_DATE_FORMATTED = "19 de Novembro de 2025 às 19:00 horas";

export default function EventLandingPage() {
  // Hook para disparar pixels
  usePixels();
  
  // Hook para carregar URL do formulário
  const { formUrl } = useFormIframe();
  
  // Hook para carregar data do evento
  const { eventDate, eventDateFormatted, loading: loadingEventDate } = useEventSettings();

  // Usar data do banco ou data padrão
  const EVENT_DATE = eventDate || DEFAULT_EVENT_DATE;
  const EVENT_DATE_FORMATTED = eventDateFormatted || DEFAULT_EVENT_DATE_FORMATTED;

  // Estado para o countdown
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Calcular countdown
  useEffect(() => {
    if (!EVENT_DATE) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const difference = EVENT_DATE.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }, [EVENT_DATE]);

  useEffect(() => {
    // ===== SISTEMA ROBUSTO DE CAPTURA DE UTMs DA PÁGINA PAI =====
    (function() {
      'use strict';
      
      function getParentUrlParams(): Record<string, string> {
        const urlParams = new URLSearchParams(window.location.search);
        const params: Record<string, string> = {};
        for (const [key, value] of urlParams.entries()) {
          params[key] = value;
        }
        return params;
      }
      
      function getParentCookie(name: string) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return '';
      }
      
      function captureParentTrackingData() {
        const urlParams = getParentUrlParams();
        
        const trackingData = {
          parentUrl: window.location.href,
          parentUrlParams: urlParams,
          utmSource: urlParams.utm_source || '',
          utmMedium: urlParams.utm_medium || '',
          utmCampaign: urlParams.utm_campaign || '',
          utmContent: urlParams.utm_content || '',
          utmTerm: urlParams.utm_term || '',
          gclid: urlParams.gclid || '',
          fbclid: urlParams.fbclid || '',
          fbc: getParentCookie('_fbc') || '',
          fbp: getParentCookie('_fbp') || '',
          fbid: getParentCookie('_fbid') || '',
          referrer: document.referrer || '',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        };
        
        return trackingData;
      }
      
      function sendTrackingDataToIframe() {
        const trackingData = captureParentTrackingData();
        const iframeIds = ['form-iframe', 'form-iframe-mobile'];
        
        iframeIds.forEach(id => {
          const iframe = document.getElementById(id) as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            try {
              iframe.contentWindow.postMessage({
                type: 'PARENT_TRACKING_DATA',
                data: trackingData
              }, '*');
            } catch (error) {
              // Erro silencioso
            }
          }
        });
      }
      
      function handleIframeRequests(event: MessageEvent) {
        if (event.data && typeof event.data === 'object') {
          if (event.data.type === 'REQUEST_PARENT_URL') {
            (event.source as Window)?.postMessage({
              type: 'PARENT_URL_RESPONSE',
              url: window.location.href
            }, '*');
          } else if (event.data.type === 'REQUEST_COOKIE') {
            const cookieValue = getParentCookie(event.data.cookieName);
            (event.source as Window)?.postMessage({
              type: 'PARENT_COOKIE_RESPONSE',
              cookieName: event.data.cookieName,
              cookieValue: cookieValue
            }, '*');
          } else if (event.data.type === 'REQUEST_TRACKING_DATA') {
            const trackingData = captureParentTrackingData();
            (event.source as Window)?.postMessage({
              type: 'PARENT_TRACKING_RESPONSE',
              data: trackingData
            }, '*');
          }
        }
      }
      
      function initTracking() {
        window.addEventListener('message', handleIframeRequests);
        
        const iframeIds = ['form-iframe', 'form-iframe-mobile'];
        iframeIds.forEach(id => {
          const iframe = document.getElementById(id) as HTMLIFrameElement;
          if (iframe) {
            iframe.onload = function() {
              setTimeout(sendTrackingDataToIframe, 100);
              setTimeout(sendTrackingDataToIframe, 500);
              setTimeout(sendTrackingDataToIframe, 1000);
            };
            
            if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
              setTimeout(sendTrackingDataToIframe, 100);
            }
          }
        });
        
        // Reduzir frequência do intervalo para melhor performance
        setInterval(sendTrackingDataToIframe, 5000);
        
        window.addEventListener('focus', () => {
          setTimeout(sendTrackingDataToIframe, 100);
        });
        
        // Removido MutationObserver para melhor performance - usar popstate se necessário
        window.addEventListener('popstate', () => {
          setTimeout(sendTrackingDataToIframe, 100);
        });
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTracking);
      } else {
        initTracking();
      }
    })();
    
    // ========== RESIZE (melhorado) - funciona em desktop e mobile ==========
    const IFRAME_IDS = ['form-iframe', 'form-iframe-mobile'];
    const lastHeights: Map<string, number> = new Map();
    const fallbackTimeouts: Map<string, ReturnType<typeof setTimeout>[]> = new Map();
    let messageListenerAdded = false;

    function isDesktop(): boolean {
      return window.innerWidth >= 768 || window.matchMedia('(min-width: 768px)').matches;
    }

    function getMinHeight(): number {
      return isDesktop() ? 200 : 250;
    }

    function getIframe(id: string): HTMLIFrameElement | null {
      return document.getElementById(id) as HTMLIFrameElement | null;
    }

    function setIframeHeight(id: string, height: number) {
      const el = getIframe(id);
      if (!el) return;

      const numericHeight = Number(height);
      if (!numericHeight || !isFinite(numericHeight) || numericHeight <= 0) {
        return;
      }

      if (!el.style.minHeight || el.style.minHeight === '0px' || el.style.minHeight === '') {
        const initialMinHeight = getMinHeight();
        el.style.minHeight = initialMinHeight + 'px';
      }

      const minHeight = getMinHeight();
      const finalHeight = Math.max(minHeight, Math.round(numericHeight));
      const lastHeight = lastHeights.get(id) || 0;

      if (Math.abs(finalHeight - lastHeight) < 5 && lastHeight > 0) {
        return;
      }

      lastHeights.set(id, finalHeight);

      el.style.height = finalHeight + 'px';
      el.style.minHeight = finalHeight + 'px';
      el.style.maxHeight = finalHeight + 'px';
      el.style.overflow = 'hidden';

      const timeouts = fallbackTimeouts.get(id);
      if (timeouts && timeouts.length > 0) {
        timeouts.forEach(timeout => clearTimeout(timeout));
        fallbackTimeouts.set(id, []);
      }
    }

    function handleResizeMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      IFRAME_IDS.forEach(id => {
        const iframe = getIframe(id);
        if (iframe && iframe.contentWindow === event.source) {
          if (data.type === 'BP_FORM_HEIGHT' && 'height' in data) {
            setIframeHeight(id, data.height as number);
          } else if (data.type === 'resize' && 'height' in data) {
            setIframeHeight(id, data.height as number);
          }
        }
      });
    }

    if (!messageListenerAdded) {
      window.addEventListener('message', handleResizeMessage);
      messageListenerAdded = true;
    }

    function initResizeFallback() {
      IFRAME_IDS.forEach(id => {
        const el = getIframe(id);
        if (!el) {
          setTimeout(initResizeFallback, 100);
          return;
        }

        if (!el.style.minHeight || el.style.minHeight === '0px' || el.style.minHeight === '') {
          const initialMinHeight = getMinHeight();
          el.style.minHeight = initialMinHeight + 'px';
        }

        if (!el.hasAttribute('data-resize-listener')) {
          el.setAttribute('data-resize-listener', 'true');
          
          el.addEventListener('load', function() {
            lastHeights.set(id, 0);
            const timeouts = fallbackTimeouts.get(id) || [];
            timeouts.forEach(timeout => clearTimeout(timeout));
            fallbackTimeouts.set(id, []);
            
            // Reduzir tentativas para melhor performance
            const attempts = [500, 1500, 2500];
            const newTimeouts: ReturnType<typeof setTimeout>[] = [];
            attempts.forEach(delay => {
              const timeout = setTimeout(function() {
                if (lastHeights.get(id) === 0) {
                  try {
                    const doc = el.contentDocument || (el.contentWindow as any)?.document;
                    if (doc) {
                      const h = Math.max(
                        doc.body.scrollHeight,
                        doc.documentElement.scrollHeight,
                        doc.body.offsetHeight,
                        doc.documentElement.offsetHeight
                      );
                      if (h > 0 && lastHeights.get(id) === 0) {
                        setIframeHeight(id, h);
                      }
                    }
                  } catch (e) {
                    if (lastHeights.get(id) === 0 && delay === attempts[attempts.length - 1]) {
                      setIframeHeight(id, 1600);
                    }
                  }
                }
              }, delay);
              newTimeouts.push(timeout);
            });
            fallbackTimeouts.set(id, newTimeouts);
          });
        }

        if (el.contentDocument && el.contentDocument.readyState === 'complete') {
          lastHeights.set(id, 0);
          const timeouts = fallbackTimeouts.get(id) || [];
          timeouts.forEach(timeout => clearTimeout(timeout));
          fallbackTimeouts.set(id, []);
          
          // Reduzir tentativas para melhor performance
          const attempts = [500, 1500, 2500];
          const newTimeouts: ReturnType<typeof setTimeout>[] = [];
          attempts.forEach(delay => {
            const timeout = setTimeout(function() {
              if (lastHeights.get(id) === 0) {
                try {
                  const doc = el.contentDocument || (el.contentWindow as any)?.document;
                  if (doc) {
                    const h = Math.max(
                      doc.body.scrollHeight,
                      doc.documentElement.scrollHeight,
                      doc.body.offsetHeight,
                      doc.documentElement.offsetHeight
                    );
                    if (h > 0 && lastHeights.get(id) === 0) {
                      setIframeHeight(id, h);
                    }
                  }
                } catch (e) {
                  if (lastHeights.get(id) === 0 && delay === attempts[attempts.length - 1]) {
                    setIframeHeight(id, 1600);
                  }
                }
              }
            }, delay);
            newTimeouts.push(timeout);
          });
          fallbackTimeouts.set(id, newTimeouts);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initResizeFallback();
      });
    } else {
      initResizeFallback();
    }

    // Reduzir tentativas de inicialização
    setTimeout(function() {
      initResizeFallback();
    }, 100);
    setTimeout(function() {
      initResizeFallback();
    }, 500);

    // Debounce resize para melhor performance
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    window.addEventListener('resize', function() {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        IFRAME_IDS.forEach(id => {
          const el = getIframe(id);
          if (el) {
            const newMinHeight = getMinHeight();
            el.style.minHeight = newMinHeight + 'px';
          }
        });
      }, 150);
    });
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#131313' }}>
      {/* Aviso Animado */}
      <div className="relative overflow-hidden py-3" style={{
        background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))',
        boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
        minHeight: '48px',
        height: 'auto'
      }}>
        <div className="flex items-center" style={{
          animation: 'scroll 30s linear infinite',
          width: 'max-content',
          minHeight: '24px',
          willChange: 'transform'
        }}>
          <div className="flex items-center whitespace-nowrap">
            <Calendar className="h-5 w-5 text-white mx-4 flex-shrink-0" />
            <span className="text-white text-sm md:text-base font-medium">
              O evento acontecerá no dia {EVENT_DATE_FORMATTED} no Horário de Brasília
            </span>
            <Video className="h-5 w-5 text-white mx-4 flex-shrink-0" />
            <span className="text-white text-sm md:text-base font-medium">
              Será um evento 100% Online via Meet
            </span>
            <img 
              src="/lpsicad/imagens/Logo-Monteo-Branca.svg"
              alt="Monteo Investimentos"
              className="h-5 w-5 mx-4 flex-shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
              loading="lazy"
              decoding="async"
            />
            <span className="text-white text-sm md:text-base font-medium">
              Esse é um evento promovido e patrocinado pela Monteo Investimentos
            </span>
          </div>
          {/* Duplicar para animação contínua */}
          <div className="flex items-center whitespace-nowrap">
            <Calendar className="h-5 w-5 text-white mx-4 flex-shrink-0" />
            <span className="text-white text-sm md:text-base font-medium">
              O evento acontecerá no dia {EVENT_DATE_FORMATTED} no Horário de Brasília
            </span>
            <Video className="h-5 w-5 text-white mx-4 flex-shrink-0" />
            <span className="text-white text-sm md:text-base font-medium">
              Será um evento 100% Online via Meet
            </span>
            <img 
              src="/lpsicad/imagens/Logo-Monteo-Branca.svg"
              alt="Monteo Investimentos"
              className="h-5 w-5 mx-4 flex-shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
              loading="lazy"
              decoding="async"
            />
            <span className="text-white text-sm md:text-base font-medium">
              Esse é um evento promovido e patrocinado pela Monteo Investimentos
            </span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative">
        {/* Mobile Version */}
        <div className="lg:hidden relative" style={{ backgroundColor: '#131313' }}>
          {/* Background Image */}
          <div 
            className="w-full bg-cover bg-center bg-no-repeat relative"
            style={{
              backgroundImage: 'url(/lpsicad/imagens/Fundo-Thaty-Mobile.webp)',
              minHeight: '500px'
            }}
          >
            {/* Countdown - acima da imagem do Eduardo */}
            <div className="flex justify-center pt-[15px] pb-4 z-10 relative">
              <div className="flex items-center gap-3">
                {/* Dias */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-2 font-medium">Dias</span>
                  <div 
                    className="rounded-lg flex items-center justify-center font-bold text-white"
                    style={{
                      background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                      border: '1px solid #A87056',
                      boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                      width: '60px',
                      height: '70px',
                      fontSize: '28px'
                    }}
                  >
                    {String(timeLeft.days).padStart(2, '0')}
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center" style={{ height: '70px' }}>
                  <span className="text-white text-2xl font-bold" style={{ color: '#A87056' }}>:</span>
                </div>

                {/* Horas */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-2 font-medium">Horas</span>
                  <div 
                    className="rounded-lg flex items-center justify-center font-bold text-white"
                    style={{
                      background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                      border: '1px solid #A87056',
                      boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                      width: '60px',
                      height: '70px',
                      fontSize: '28px'
                    }}
                  >
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center" style={{ height: '70px' }}>
                  <span className="text-white text-2xl font-bold" style={{ color: '#A87056' }}>:</span>
                </div>

                {/* Minutos */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-2 font-medium">Min</span>
                  <div 
                    className="rounded-lg flex items-center justify-center font-bold text-white"
                    style={{
                      background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                      border: '1px solid #A87056',
                      boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                      width: '60px',
                      height: '70px',
                      fontSize: '28px'
                    }}
                  >
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center" style={{ height: '70px' }}>
                  <span className="text-white text-2xl font-bold" style={{ color: '#A87056' }}>:</span>
                </div>

                {/* Segundos */}
                <div className="flex flex-col items-center">
                  <span className="text-gray-400 text-xs mb-2 font-medium">Seg</span>
                  <div 
                    className="rounded-lg flex items-center justify-center font-bold text-white"
                    style={{
                      background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                      border: '1px solid #A87056',
                      boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                      width: '60px',
                      height: '70px',
                      fontSize: '28px'
                    }}
                  >
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>

            {/* Imagem do Eduardo - sobrepondo o countdown */}
            <div className="flex items-center justify-center" style={{ marginTop: '-70px', position: 'relative', zIndex: 10 }}>
              <img 
                src="/lpsicad/imagens/Thaty-Mobile.webp"
                alt="Eduardo"
                className="max-w-[90%] object-contain"
                style={{ maxHeight: '450px' }}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width="400"
                height="450"
              />
            </div>

            {/* Textos sobrepostos à imagem */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10 space-y-4">
              <p className="text-center text-gray-300" style={{ fontSize: '16px', fontWeight: 500 }}>
                Conheça a Estratégia dos Super Ricos Para
              </p>

              <h1 className="text-center font-bold text-white leading-tight" style={{ fontSize: '24px', lineHeight: '1.2' }}>
                <span style={{
                  background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  TER RENDA VITALÍCIA
                </span>{" "}
                COM IMÓVEIS USANDO O CAPITAL DE TERCEIROS
              </h1>
            </div>
          </div>
          
          {/* Content Container */}
          <div className="px-4 py-4 space-y-6" style={{ backgroundColor: '#131313' }}>
            {/* Caixa de Inscrição */}
            <div className="rounded-lg overflow-hidden mx-auto" style={{ maxWidth: '100%', width: '100%' }}>
              {/* Parte Superior */}
              <div className="py-4 px-6 text-center relative" style={{
                background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))'
              }}>
                <span className="text-white text-lg font-bold">
                  Faça sua inscrição gratuita
                </span>
                {/* Seta para baixo */}
                <div className="absolute" style={{ bottom: '-15px', left: '20px' }}>
                  <svg width="30" height="15" viewBox="0 0 30 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0 L15 15 L30 0 Z" fill="#8F5F49" />
                  </svg>
                </div>
              </div>

              {/* Parte Inferior */}
              <div className="py-6 px-5" style={{
                background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                overflow: 'visible'
              }}>
                <iframe 
                  src={formUrl} 
                  width="100%" 
                  scrolling="no" 
                  frameBorder="0" 
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                    minHeight: '300px',
                    display: 'block'
                  }}
                  title="Formulário de Contato"
                  id="form-iframe-mobile"
                />
              </div>
            </div>

            <p className="text-gray-300 text-center" style={{ fontSize: '16px', lineHeight: '1.6' }}>
              Neste encontro, vou mostrar o passo a passo usado por investidores para construir renda vitalícia com imóveis usando capital de outras pessoas para pagar pela maior parte deles
            </p>
          </div>
        </div>

        {/* Desktop Version */}
        <div className="hidden lg:block relative min-h-[90vh]">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/lpsicad/imagens/Fundo-Thaty-Desktop.webp)'
            }}
          />

          <div className="relative z-10 h-[90vh] flex items-center w-full" style={{
            paddingLeft: '100px',
            paddingRight: '100px',
            marginLeft: '0',
            marginRight: '0'
          }}>
            <div className="w-full grid grid-cols-12 gap-8 items-center relative">
              {/* Coluna Esquerda - Textos */}
              <div className="col-span-5 relative z-20" style={{ paddingRight: '60px', width: '580px', maxWidth: '580px' }}>
                <div className="space-y-2">
                  <p className="text-gray-300" style={{
                    fontSize: '25px',
                    fontWeight: 500
                  }}>
                    Conheça a Estratégia dos Super Ricos Para
                  </p>
                  <h1 className="font-bold text-white" style={{ lineHeight: '1.2', fontSize: '42px' }}>
                    <span style={{
                      background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      TER RENDA VITALÍCIA
                    </span>{" "}
                    COM IMÓVEIS USANDO O CAPITAL DE TERCEIROS
                  </h1>

                  <p className="text-gray-300 mt-4" style={{ fontSize: '18px', lineHeight: '1.6' }}>
                    Neste encontro, vou mostrar o passo a passo usado por investidores para construir renda vitalícia com imóveis usando capital de outras pessoas para pagar pela maior parte deles
                  </p>

                  {/* Countdown */}
                  <div style={{ marginTop: '15px' }}>
                    <div className="flex items-center gap-3 lg:gap-4">
                      {/* Dias */}
                      <div className="flex flex-col items-center">
                        <div 
                          className="rounded-lg flex items-center justify-center font-bold text-white"
                          style={{
                            background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                            border: '1px solid #A87056',
                            boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                            width: '60px',
                            height: '70px',
                            fontSize: '28px'
                          }}
                        >
                          {String(timeLeft.days).padStart(2, '0')}
                        </div>
                        <span className="text-gray-400 text-xs mt-2 font-medium">Dias</span>
                      </div>

                      <div className="flex items-center" style={{ height: '70px' }}>
                        <span className="text-white text-2xl font-bold" style={{ color: '#A87056' }}>:</span>
                      </div>

                      {/* Horas */}
                      <div className="flex flex-col items-center">
                        <div 
                          className="rounded-lg flex items-center justify-center font-bold text-white"
                          style={{
                            background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                            border: '1px solid #A87056',
                            boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                            width: '60px',
                            height: '70px',
                            fontSize: '28px'
                          }}
                        >
                          {String(timeLeft.hours).padStart(2, '0')}
                        </div>
                        <span className="text-gray-400 text-xs mt-2 font-medium">Horas</span>
                      </div>

                      <div className="flex items-center" style={{ height: '70px' }}>
                        <span className="text-white text-2xl font-bold" style={{ color: '#A87056' }}>:</span>
                      </div>

                      {/* Minutos */}
                      <div className="flex flex-col items-center">
                        <div 
                          className="rounded-lg flex items-center justify-center font-bold text-white"
                          style={{
                            background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                            border: '1px solid #A87056',
                            boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                            width: '60px',
                            height: '70px',
                            fontSize: '28px'
                          }}
                        >
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </div>
                        <span className="text-gray-400 text-xs mt-2 font-medium">Min</span>
                      </div>

                      <div className="flex items-center" style={{ height: '70px' }}>
                        <span className="text-white text-2xl font-bold" style={{ color: '#A87056' }}>:</span>
                      </div>

                      {/* Segundos */}
                      <div className="flex flex-col items-center">
                        <div 
                          className="rounded-lg flex items-center justify-center font-bold text-white"
                          style={{
                            background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                            border: '1px solid #A87056',
                            boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)',
                            width: '60px',
                            height: '70px',
                            fontSize: '28px'
                          }}
                        >
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </div>
                        <span className="text-gray-400 text-xs mt-2 font-medium">Seg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Meio - Imagem do Eduardo */}
              <div className="col-span-4 flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-0">
                <img 
                  src="/lpsicad/imagens/Thaty-Desktop.webp"
                  alt="Eduardo"
                  className="w-auto object-contain"
                  style={{
                    height: '90vh',
                    maxWidth: 'none',
                    width: 'auto'
                  }}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width="600"
                  height="900"
                />
              </div>

              {/* Coluna Direita - Formulário */}
              <div className="col-start-8 col-end-13 relative z-20 flex justify-end">
                <div className="rounded-lg overflow-hidden" style={{ maxWidth: '350px', width: '100%' }}>
                  <div className="py-4 px-6 text-center relative" style={{
                    background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))'
                  }}>
                    <span className="text-white text-lg font-bold">
                      Faça sua inscrição gratuita
                    </span>
                    <div className="absolute" style={{ bottom: '-15px', left: '20px' }}>
                      <svg width="30" height="15" viewBox="0 0 30 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0 L15 15 L30 0 Z" fill="#8F5F49" />
                      </svg>
                    </div>
                  </div>

                  <div className="py-6 px-5 lg:px-[25px]" style={{
                    background: 'linear-gradient(180deg, #1E1E1E, #131313)',
                    overflow: 'visible'
                  }}>
                    <iframe 
                      src={formUrl} 
                      width="100%" 
                      scrolling="no" 
                      frameBorder="0" 
                      style={{
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        backgroundColor: 'transparent',
                        overflow: 'hidden',
                        minHeight: '200px',
                        display: 'block'
                      }}
                      title="Formulário de Contato"
                      id="form-iframe"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divisória entre seções */}
      <div className="relative" style={{ 
        height: '40px'
      }}>
        <div 
          className="absolute left-0 right-0 top-[50px] lg:top-0"
          style={{
            height: '1px',
            background: 'linear-gradient(180deg, #FFFFFF, #333333)',
            zIndex: 1
          }}
        ></div>
        
        <div className="absolute top-[50px] lg:top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{
          zIndex: 10
        }}>
          <div 
            className="rounded-full absolute"
            style={{
              width: '64px',
              height: '64px',
              border: '10px solid rgba(168, 112, 86, 0.35)',
              boxSizing: 'border-box',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
          <div 
            className="rounded-full flex items-center justify-center relative"
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: '#A87056'
            }}
          >
            <ChevronDown className="text-white" size={20} />
          </div>
        </div>
      </div>

      {/* Seção No GPS para Construção de Riqueza você verá */}
      <section className="py-16 lg:py-[50px]" style={{ backgroundColor: '#131313' }}>
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="font-bold text-white text-center mb-12 lg:mb-16 text-[20px] lg:text-[32px]">
            No GPS para Construção de Riqueza você verá
          </h2>
          
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div 
              className="rounded-lg transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #A87056, #353535)',
                padding: '0.5px',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <div 
                className="rounded-lg p-6 lg:p-8 h-full"
                style={{
                  background: 'linear-gradient(180deg, #131313, #1E1E1E)'
                }}
              >
                <div className="flex justify-center mb-4">
                  <div 
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '20px solid rgba(168, 112, 86, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#A87056" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                  </div>
                </div>
                
                <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                  Cálculo para descobrir quanto de renda passiva você deveria ter baseado na sua idade
                </p>
              </div>
            </div>

            <div 
              className="rounded-lg transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #A87056, #353535)',
                padding: '0.5px',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <div 
                className="rounded-lg p-6 lg:p-8 h-full"
                style={{
                  background: 'linear-gradient(180deg, #131313, #1E1E1E)'
                }}
              >
                <div className="flex justify-center mb-4">
                  <div 
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '20px solid rgba(168, 112, 86, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#A87056" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
                    </svg>
                  </div>
                </div>
                
                <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                  A estrutura do mercado que te ajudará a não depender do governo na sua aposentadoria
                </p>
              </div>
            </div>

            <div 
              className="rounded-lg transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #A87056, #353535)',
                padding: '0.5px',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <div 
                className="rounded-lg p-6 lg:p-8 h-full"
                style={{
                  background: 'linear-gradient(180deg, #131313, #1E1E1E)'
                }}
              >
                <div className="flex justify-center mb-4">
                  <div 
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      border: '20px solid rgba(168, 112, 86, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#A87056" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </div>
                </div>
                
                <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                  Estratégia para adquirir imóveis que rentabilizam mais de 1% ao mês, sem dar entrada e pagando apenas uma parte deles
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Para quem é */}
      <section className="py-16 lg:py-0 relative" style={{ backgroundColor: '#131313' }}>
        {/* Background Image - Desktop Only */}
        <div 
          className="hidden lg:block absolute inset-0 bg-contain bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: 'url(/lpsicad/imagens/Fundo-pra-quem-e.webp)'
          }}
        />
        <div className="container mx-auto px-4 lg:px-8 relative z-10 lg:min-h-[800px] lg:flex lg:items-center lg:justify-center">
          <div className="w-full">
            <h2 className="font-bold text-white text-center mb-12 lg:mb-16 text-[20px] lg:text-[32px]">
              O Workshop GPS é para você que:
            </h2>
            
            <div className="max-w-4xl mx-auto space-y-3">
            <div 
              className="rounded-lg p-6 lg:p-8 transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #131313, #1E1E1E)',
                border: '1px solid #A87056',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                Não quer tirar dinheiro da sua empresa para construir patrimônio na pessoa física
              </p>
            </div>

            <div 
              className="rounded-lg p-6 lg:p-8 transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #131313, #1E1E1E)',
                border: '1px solid #A87056',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                Não quer tirar dinheiro da conta e se descapitalizar para construir patrimônio
              </p>
            </div>

            <div 
              className="rounded-lg p-6 lg:p-8 transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #131313, #1E1E1E)',
                border: '1px solid #A87056',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                Quer ter 2, 4, 6 ou até mais imóveis pelo valor de 1 acelerando anos de investimentos.
              </p>
            </div>

            <div 
              className="rounded-lg p-6 lg:p-8 transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'linear-gradient(180deg, #131313, #1E1E1E)',
                border: '1px solid #A87056',
                boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
              }}
            >
              <p className="text-white text-base lg:text-lg leading-relaxed text-center">
                Tem uma renda de R$ 6 mil reais ou mais e acredita que investir é importante
              </p>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Seção Quem sou eu */}
      <section className="py-16 lg:py-[50px]" style={{ backgroundColor: '#131313' }}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto lg:mx-[250px]">
            <div 
              className="rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.5fr]"
              style={{
                backgroundColor: '#1E1E1E',
                gap: 0,
                border: '2px solid #333333'
              }}
            >
              <div className="relative" style={{ backgroundColor: '#1E1E1E', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img 
                  src="/lpsicad/imagens/Thaty-Quem-Sou.webp"
                  alt="Eduardo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                  loading="lazy"
                  decoding="async"
                  width="600"
                  height="400"
                />
              </div>

              <div className="p-8 lg:p-12 flex flex-col justify-center" style={{ backgroundColor: '#1E1E1E' }}>
                <h2 className="font-bold text-white mb-6 text-[20px] lg:text-3xl">
                  Quem é Thatiele
                </h2>
                <div className="space-y-4 text-white text-base lg:text-lg leading-relaxed">
                  <p>
                    Consultora e franqueada da Monteo investimentos , Thaty construiu uma carreira que tem mais 64 milhões sob a sua gestão, uma das maiores consultoras atualmente.
                  </p>
                  <p>
                    Formada em contabilidade e economia, pós graduada em consultoria econômica e tem mais de 16 anos de experiência com gestão financeira . Propósito de vida mudar a vida das pessoas através do conhecimento e dos investimentos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Monteo */}
      <section className="flex items-center justify-center" style={{ 
        paddingTop: '100px', 
        paddingBottom: '100px',
        backgroundColor: '#131313'
      }}>
        <img 
          src="/lpsicad/imagens/Logo-Monteo.png"
          alt="Logo Monteo Investimentos"
          style={{ width: '200px', height: 'auto', maxWidth: '100%' }}
          loading="lazy"
          decoding="async"
          width="200"
          height="60"
        />
      </section>
    </div>
  );
}

