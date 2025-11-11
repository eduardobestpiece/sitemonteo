import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MONTEO_COMPANY_ID = '62855c99-3a9a-41a1-80bd-b4ea8d2a22b1';

interface Pixel {
  id: string;
  type: 'meta_ads' | 'google_ads' | 'google_analytics';
  pixel_id: string;
  token?: string;
}

export function usePixels() {
  const location = useLocation();
  const scrollTracked = useRef(false);
  const clickTracked = useRef<Set<string>>(new Set());
  const videoTracked = useRef<Set<string>>(new Set());
  const pixelsRef = useRef<Pixel[]>([]);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedPixels = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Limpar pixels inicializados ao mudar de página
    initializedPixels.current.clear();
    scrollTracked.current = false;
    clickTracked.current.clear();
    videoTracked.current.clear();
    
    loadAndFirePixels();
  }, [location.pathname]);

  useEffect(() => {
    // Setup event listeners após pixels carregarem
    if (pixelsRef.current.length > 0) {
      const cleanup = setupEventTracking();
      return cleanup;
    }
    
    return () => {
      // Cleanup
      scrollTracked.current = false;
      clickTracked.current.clear();
      videoTracked.current.clear();
      initializedPixels.current.clear();
    };
  }, [pixelsRef.current.length, location.pathname]);

  const loadAndFirePixels = async () => {
    try {
      const { data, error } = await supabase
        .from('event_page_settings')
        .select('pixels')
        .eq('company_id', MONTEO_COMPANY_ID)
        .single();

      if (error || !data || !data.pixels) {
        return;
      }

      const pixels: Pixel[] = data.pixels;
      pixelsRef.current = pixels;
      
      // Primeiro, inicializar todos os pixels Meta
      const metaPixels = pixels.filter(p => p.type === 'meta_ads' && p.pixel_id);
      
      if (metaPixels.length > 0) {
        // Carregar script do Meta Pixel apenas uma vez
        if (!window.fbq) {
          (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
            if (f.fbq) return;
            n = f.fbq = function() {
              n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            t.onload = () => {
              console.log('Script do Meta Pixel carregado');
            };
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
          })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        }
        
        // Função para inicializar todos os pixels e disparar PageView
        const initializeAndFirePixels = (attempts = 0) => {
          // Limitar tentativas para evitar loop infinito
          if (attempts > 50) {
            console.error('Timeout ao inicializar pixels do Meta');
            return;
          }
          
          // Verificar se o script carregou
          if (!window.fbq || typeof window.fbq !== 'function') {
            setTimeout(() => initializeAndFirePixels(attempts + 1), 100);
            return;
          }
          
          // Verificar se o script está realmente pronto (não apenas a função existe)
          if (!window.fbq.loaded) {
            setTimeout(() => initializeAndFirePixels(attempts + 1), 100);
            return;
          }
          
          // Inicializar cada pixel
          metaPixels.forEach(pixel => {
            if (!pixel.pixel_id) return;
            
            const pixelKey = pixel.pixel_id;
            if (!initializedPixels.current.has(pixelKey)) {
              try {
                // Inicializar o pixel
                window.fbq('init', pixel.pixel_id);
                initializedPixels.current.add(pixelKey);
                console.log('Pixel inicializado:', pixel.pixel_id);
              } catch (e) {
                console.error('Erro ao inicializar pixel:', pixel.pixel_id, e);
              }
            }
          });
          
          // Verificar se todos foram inicializados
          const allInitialized = metaPixels.every(p => initializedPixels.current.has(p.pixel_id));
          
          if (allInitialized) {
            // Aguardar um pouco mais para garantir que os pixels estão prontos
            setTimeout(() => {
              // Disparar PageView - isso dispara para TODOS os pixels inicializados
              try {
                const eventId = `PageView_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                window.fbq('track', 'PageView', {}, { eventID: eventId });
                console.log('PageView disparado para todos os pixels');
              } catch (e) {
                console.error('Erro ao disparar PageView:', e);
              }
              
              // Disparar CAPI para cada pixel individualmente
              metaPixels.forEach(pixel => {
                if (pixel.token) {
                  fireMetaCAPI(pixel, 'PageView', {});
                }
              });
            }, 300);
          } else {
            // Ainda não foram todos inicializados, tentar novamente
            setTimeout(() => initializeAndFirePixels(attempts + 1), 200);
          }
        };
        
        // Aguardar o script carregar antes de inicializar
        // Se o script já estiver carregado, iniciar imediatamente
        if (window.fbq && window.fbq.loaded) {
          initializeAndFirePixels();
        } else {
          setTimeout(() => initializeAndFirePixels(), 500);
        }
      }
      
      // Disparar outros tipos de pixels
      pixels.forEach(pixel => {
        if (pixel.type === 'google_ads') {
          fireGoogleAdsPixel(pixel, 'page_view');
        } else if (pixel.type === 'google_analytics') {
          fireGoogleAnalyticsPixel(pixel, 'page_view');
        }
      });
    } catch (error) {
      console.error('Erro ao carregar pixels:', error);
    }
  };

  const fireMetaPixel = (pixel: Pixel, eventName: string = 'PageView', customData: Record<string, any> = {}) => {
    if (!pixel.pixel_id) return;

    // Verificar se fbq está disponível
    if (!window.fbq || typeof window.fbq !== 'function') {
      console.warn('fbq não está disponível');
      return;
    }

    // Garantir que o pixel foi inicializado
    const pixelKey = pixel.pixel_id;
    if (!initializedPixels.current.has(pixelKey)) {
      // Tentar inicializar agora
      try {
        window.fbq('init', pixel.pixel_id);
        initializedPixels.current.add(pixelKey);
        console.log('Pixel inicializado dinamicamente:', pixel.pixel_id);
      } catch (e) {
        console.error('Erro ao inicializar pixel:', pixel.pixel_id, e);
        return;
      }
    }

    // Disparar evento no pixel base
    // O Meta Pixel Base dispara para TODOS os pixels inicializados quando você chama fbq('track')
    const eventId = `${pixel.pixel_id}_${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (eventName === 'PageView') {
        // PageView dispara para todos os pixels inicializados
        window.fbq('track', 'PageView', {}, { eventID: eventId });
      } else {
        // Eventos customizados também disparam para todos
        window.fbq('trackCustom', eventName, customData, { eventID: eventId });
      }
    } catch (e) {
      console.error('Erro ao disparar evento para pixel:', pixel.pixel_id, e);
    }

    // Meta Conversions API (CAPI) - sempre disparar se tiver token
    // O CAPI já é específico por pixel (usa o pixel_id e token específicos)
    if (pixel.token) {
      fireMetaCAPI(pixel, eventName, customData);
    }
  };

  const setupEventTracking = (): (() => void) => {
    // Tracking de Scroll (75% da página)
    const handleScroll = () => {
      if (scrollTracked.current) return;
      
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent >= 75) {
        scrollTracked.current = true;
        
        // Disparar para TODOS os pixels Meta configurados
        const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
        
        // Disparar Pixel Base uma vez (dispara para todos os pixels inicializados)
        if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
          try {
            const eventId = `Scroll75_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window.fbq('trackCustom', 'Scroll75', {
              scroll_depth: 75,
              page_url: window.location.href
            }, { eventID: eventId });
          } catch (e) {
            console.error('Erro ao disparar Scroll75 no Pixel Base:', e);
          }
        }
        
        // Disparar CAPI para cada pixel individualmente
        metaPixels.forEach(pixel => {
          if (pixel.token) {
            fireMetaCAPI(pixel, 'Scroll75', {
              scroll_depth: 75,
              page_url: window.location.href
            });
          }
        });
        
        // Disparar para Google Ads e Analytics
        pixelsRef.current.forEach(pixel => {
          if (pixel.type === 'google_ads') {
            fireGoogleAdsPixel(pixel, 'scroll', {
              scroll_depth: 75,
              event_category: 'engagement',
              event_label: '75% scroll depth'
            });
          } else if (pixel.type === 'google_analytics') {
            fireGoogleAnalyticsPixel(pixel, 'scroll', {
              scroll_depth: 75,
              event_category: 'engagement',
              event_label: '75% scroll depth'
            });
          }
        });
        
        // Remover listener após disparar
        window.removeEventListener('scroll', handleScroll);
      }
    };

    // Debounce para scroll
    const debouncedScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });

    // Tracking de Cliques
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignorar cliques em elementos específicos (botões de pixel, etc)
      if (target.closest('script, style, iframe')) return;

      // Criar ID único para o elemento clicado
      const elementId = target.id || 
                       target.className || 
                       target.tagName || 
                       `${target.offsetTop}_${target.offsetLeft}`;
      
      const clickKey = `${elementId}_${target.textContent?.substring(0, 20) || ''}`;
      
      // Evitar múltiplos disparos do mesmo elemento
      if (clickTracked.current.has(clickKey)) return;
      clickTracked.current.add(clickKey);

      // Aguardar um pouco antes de disparar (para evitar cliques acidentais)
      setTimeout(() => {
        const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
        const customData = {
          content_name: target.textContent?.substring(0, 100) || '',
          content_category: target.tagName.toLowerCase(),
          click_url: (target as HTMLAnchorElement).href || window.location.href,
          element_id: elementId
        };
        
        // Disparar Pixel Base uma vez (dispara para todos os pixels inicializados)
        if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
          try {
            const eventId = `Click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window.fbq('trackCustom', 'Click', customData, { eventID: eventId });
          } catch (e) {
            console.error('Erro ao disparar Click no Pixel Base:', e);
          }
        }
        
        // Disparar CAPI para cada pixel individualmente
        metaPixels.forEach(pixel => {
          if (pixel.token) {
            fireMetaCAPI(pixel, 'Click', customData);
          }
        });
        
        // Disparar para Google Ads e Analytics
        pixelsRef.current.forEach(pixel => {
          if (pixel.type === 'google_ads') {
            fireGoogleAdsPixel(pixel, 'click', {
              event_category: customData.content_category || 'interaction',
              event_label: customData.content_name || 'element_click',
              click_url: customData.click_url || window.location.href,
              element_id: customData.element_id
            });
          } else if (pixel.type === 'google_analytics') {
            fireGoogleAnalyticsPixel(pixel, 'click', {
              event_category: customData.content_category || 'interaction',
              event_label: customData.content_name || 'element_click',
              click_url: customData.click_url || window.location.href,
              element_id: customData.element_id
            });
          }
        });
      }, 100);
    };

    document.addEventListener('click', handleClick, true);

    // Tracking de Vídeos
    const setupVideoTracking = () => {
      const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
      
      videos.forEach((video, index) => {
        const videoId = `video_${index}_${Date.now()}`;
        
        if (videoTracked.current.has(videoId)) return;

        if (video.tagName === 'VIDEO') {
          const htmlVideo = video as HTMLVideoElement;
          
          // Play
          htmlVideo.addEventListener('play', () => {
            if (!videoTracked.current.has(`${videoId}_play`)) {
              videoTracked.current.add(`${videoId}_play`);
              const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
              const customData = {
                video_title: htmlVideo.title || document.title,
                video_url: htmlVideo.src || window.location.href,
                content_type: 'video'
              };
              
              if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                try {
                  const eventId = `VideoPlay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  window.fbq('trackCustom', 'VideoPlay', customData, { eventID: eventId });
                } catch (e) {
                  console.error('Erro ao disparar VideoPlay no Pixel Base:', e);
                }
              }
              
              metaPixels.forEach(pixel => {
                if (pixel.token) {
                  fireMetaCAPI(pixel, 'VideoPlay', customData);
                }
              });
              
              // Disparar para Google Ads e Analytics
              pixelsRef.current.forEach(pixel => {
                if (pixel.type === 'google_ads') {
                  fireGoogleAdsPixel(pixel, 'video_start', {
                    video_title: customData.video_title,
                    video_url: customData.video_url,
                    event_category: 'video',
                    event_label: 'Video Play'
                  });
                } else if (pixel.type === 'google_analytics') {
                  fireGoogleAnalyticsPixel(pixel, 'video_start', {
                    video_title: customData.video_title,
                    video_url: customData.video_url,
                    event_category: 'video',
                    event_label: 'Video Play'
                  });
                }
              });
            }
          }, { once: true });

          // 25% do vídeo
          htmlVideo.addEventListener('timeupdate', () => {
            if (htmlVideo.duration && htmlVideo.currentTime / htmlVideo.duration >= 0.25) {
              if (!videoTracked.current.has(`${videoId}_25`)) {
                videoTracked.current.add(`${videoId}_25`);
                const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
                const customData = {
                  video_title: htmlVideo.title || document.title,
                  video_url: htmlVideo.src || window.location.href,
                  content_type: 'video'
                };
                
                if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                  try {
                    const eventId = `VideoView25_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    window.fbq('trackCustom', 'VideoView25', customData, { eventID: eventId });
                  } catch (e) {
                    console.error('Erro ao disparar VideoView25 no Pixel Base:', e);
                  }
                }
                
                metaPixels.forEach(pixel => {
                  if (pixel.token) {
                    fireMetaCAPI(pixel, 'VideoView25', customData);
                  }
                });
                
                // Disparar para Google Ads e Analytics
                pixelsRef.current.forEach(pixel => {
                  if (pixel.type === 'google_ads') {
                    fireGoogleAdsPixel(pixel, 'video_progress', {
                      video_title: customData.video_title,
                      video_url: customData.video_url,
                      video_percent: 25,
                      event_category: 'video',
                      event_label: 'Video 25%'
                    });
                  } else if (pixel.type === 'google_analytics') {
                    fireGoogleAnalyticsPixel(pixel, 'video_progress', {
                      video_title: customData.video_title,
                      video_url: customData.video_url,
                      video_percent: 25,
                      event_category: 'video',
                      event_label: 'Video 25%'
                    });
                  }
                });
              }
            }
          });

          // 50% do vídeo
          htmlVideo.addEventListener('timeupdate', () => {
            if (htmlVideo.duration && htmlVideo.currentTime / htmlVideo.duration >= 0.5) {
              if (!videoTracked.current.has(`${videoId}_50`)) {
                videoTracked.current.add(`${videoId}_50`);
                const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
                const customData = {
                  video_title: htmlVideo.title || document.title,
                  video_url: htmlVideo.src || window.location.href,
                  content_type: 'video'
                };
                
                if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                  try {
                    const eventId = `VideoView50_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    window.fbq('trackCustom', 'VideoView50', customData, { eventID: eventId });
                  } catch (e) {
                    console.error('Erro ao disparar VideoView50 no Pixel Base:', e);
                  }
                }
                
                metaPixels.forEach(pixel => {
                  if (pixel.token) {
                    fireMetaCAPI(pixel, 'VideoView50', customData);
                  }
                });
                
                // Disparar para Google Ads e Analytics
                pixelsRef.current.forEach(pixel => {
                  if (pixel.type === 'google_ads') {
                    fireGoogleAdsPixel(pixel, 'video_progress', {
                      video_title: customData.video_title,
                      video_url: customData.video_url,
                      video_percent: 50,
                      event_category: 'video',
                      event_label: 'Video 50%'
                    });
                  } else if (pixel.type === 'google_analytics') {
                    fireGoogleAnalyticsPixel(pixel, 'video_progress', {
                      video_title: customData.video_title,
                      video_url: customData.video_url,
                      video_percent: 50,
                      event_category: 'video',
                      event_label: 'Video 50%'
                    });
                  }
                });
              }
            }
          });

          // 75% do vídeo
          htmlVideo.addEventListener('timeupdate', () => {
            if (htmlVideo.duration && htmlVideo.currentTime / htmlVideo.duration >= 0.75) {
              if (!videoTracked.current.has(`${videoId}_75`)) {
                videoTracked.current.add(`${videoId}_75`);
                const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
                const customData = {
                  video_title: htmlVideo.title || document.title,
                  video_url: htmlVideo.src || window.location.href,
                  content_type: 'video'
                };
                
                if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                  try {
                    const eventId = `VideoView75_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    window.fbq('trackCustom', 'VideoView75', customData, { eventID: eventId });
                  } catch (e) {
                    console.error('Erro ao disparar VideoView75 no Pixel Base:', e);
                  }
                }
                
                metaPixels.forEach(pixel => {
                  if (pixel.token) {
                    fireMetaCAPI(pixel, 'VideoView75', customData);
                  }
                });
                
                // Disparar para Google Ads e Analytics
                pixelsRef.current.forEach(pixel => {
                  if (pixel.type === 'google_ads') {
                    fireGoogleAdsPixel(pixel, 'video_progress', {
                      video_title: customData.video_title,
                      video_url: customData.video_url,
                      video_percent: 75,
                      event_category: 'video',
                      event_label: 'Video 75%'
                    });
                  } else if (pixel.type === 'google_analytics') {
                    fireGoogleAnalyticsPixel(pixel, 'video_progress', {
                      video_title: customData.video_title,
                      video_url: customData.video_url,
                      video_percent: 75,
                      event_category: 'video',
                      event_label: 'Video 75%'
                    });
                  }
                });
              }
            }
          });

          // Completo
          htmlVideo.addEventListener('ended', () => {
            if (!videoTracked.current.has(`${videoId}_complete`)) {
              videoTracked.current.add(`${videoId}_complete`);
              const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
              const customData = {
                video_title: htmlVideo.title || document.title,
                video_url: htmlVideo.src || window.location.href,
                content_type: 'video'
              };
              
              if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                try {
                  const eventId = `VideoComplete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  window.fbq('trackCustom', 'VideoComplete', customData, { eventID: eventId });
                } catch (e) {
                  console.error('Erro ao disparar VideoComplete no Pixel Base:', e);
                }
              }
              
              metaPixels.forEach(pixel => {
                if (pixel.token) {
                  fireMetaCAPI(pixel, 'VideoComplete', customData);
                }
              });
              
              // Disparar para Google Ads e Analytics
              pixelsRef.current.forEach(pixel => {
                if (pixel.type === 'google_ads') {
                  fireGoogleAdsPixel(pixel, 'video_complete', {
                    video_title: customData.video_title,
                    video_url: customData.video_url,
                    event_category: 'video',
                    event_label: 'Video Complete'
                  });
                } else if (pixel.type === 'google_analytics') {
                  fireGoogleAnalyticsPixel(pixel, 'video_complete', {
                    video_title: customData.video_title,
                    video_url: customData.video_url,
                    event_category: 'video',
                    event_label: 'Video Complete'
                  });
                }
              });
            }
          }, { once: true });
        } else if (video.tagName === 'IFRAME') {
          // Para iframes de vídeo (YouTube, Vimeo), usar postMessage
          const iframe = video as HTMLIFrameElement;
          if (iframe.src.includes('youtube.com') || iframe.src.includes('youtu.be')) {
            // YouTube tracking via postMessage
            window.addEventListener('message', (event) => {
              if (event.origin !== 'https://www.youtube.com') return;
              
              const data = event.data;
              if (data && typeof data === 'object' && data.info) {
                const videoData = data.info;
                
                if (videoData.videoProgress && !videoTracked.current.has(`${videoId}_progress`)) {
                  const progress = videoData.videoProgress;
                  
                  const metaPixels = pixelsRef.current.filter(p => p.type === 'meta_ads');
                  
                  if (progress >= 0.25 && !videoTracked.current.has(`${videoId}_25`)) {
                    videoTracked.current.add(`${videoId}_25`);
                    const customData = {
                      video_title: videoData.videoTitle || document.title,
                      video_url: iframe.src,
                      content_type: 'video'
                    };
                    
                    if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                      try {
                        const eventId = `VideoView25_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        window.fbq('trackCustom', 'VideoView25', customData, { eventID: eventId });
                      } catch (e) {
                        console.error('Erro ao disparar VideoView25 no Pixel Base:', e);
                      }
                    }
                    
                    metaPixels.forEach(pixel => {
                      if (pixel.token) {
                        fireMetaCAPI(pixel, 'VideoView25', customData);
                      }
                    });
                    
                    // Disparar para Google Ads e Analytics
                    pixelsRef.current.forEach(pixel => {
                      if (pixel.type === 'google_ads') {
                        fireGoogleAdsPixel(pixel, 'video_progress', {
                          video_title: customData.video_title,
                          video_url: customData.video_url,
                          video_percent: 25,
                          event_category: 'video',
                          event_label: 'Video 25%'
                        });
                      } else if (pixel.type === 'google_analytics') {
                        fireGoogleAnalyticsPixel(pixel, 'video_progress', {
                          video_title: customData.video_title,
                          video_url: customData.video_url,
                          video_percent: 25,
                          event_category: 'video',
                          event_label: 'Video 25%'
                        });
                      }
                    });
                  }
                  
                  if (progress >= 0.5 && !videoTracked.current.has(`${videoId}_50`)) {
                    videoTracked.current.add(`${videoId}_50`);
                    const customData = {
                      video_title: videoData.videoTitle || document.title,
                      video_url: iframe.src,
                      content_type: 'video'
                    };
                    
                    if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                      try {
                        const eventId = `VideoView50_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        window.fbq('trackCustom', 'VideoView50', customData, { eventID: eventId });
                      } catch (e) {
                        console.error('Erro ao disparar VideoView50 no Pixel Base:', e);
                      }
                    }
                    
                    metaPixels.forEach(pixel => {
                      if (pixel.token) {
                        fireMetaCAPI(pixel, 'VideoView50', customData);
                      }
                    });
                    
                    // Disparar para Google Ads e Analytics
                    pixelsRef.current.forEach(pixel => {
                      if (pixel.type === 'google_ads') {
                        fireGoogleAdsPixel(pixel, 'video_progress', {
                          video_title: customData.video_title,
                          video_url: customData.video_url,
                          video_percent: 50,
                          event_category: 'video',
                          event_label: 'Video 50%'
                        });
                      } else if (pixel.type === 'google_analytics') {
                        fireGoogleAnalyticsPixel(pixel, 'video_progress', {
                          video_title: customData.video_title,
                          video_url: customData.video_url,
                          video_percent: 50,
                          event_category: 'video',
                          event_label: 'Video 50%'
                        });
                      }
                    });
                  }
                  
                  if (progress >= 0.75 && !videoTracked.current.has(`${videoId}_75`)) {
                    videoTracked.current.add(`${videoId}_75`);
                    const customData = {
                      video_title: videoData.videoTitle || document.title,
                      video_url: iframe.src,
                      content_type: 'video'
                    };
                    
                    if (metaPixels.length > 0 && window.fbq && typeof window.fbq === 'function') {
                      try {
                        const eventId = `VideoView75_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        window.fbq('trackCustom', 'VideoView75', customData, { eventID: eventId });
                      } catch (e) {
                        console.error('Erro ao disparar VideoView75 no Pixel Base:', e);
                      }
                    }
                    
                    metaPixels.forEach(pixel => {
                      if (pixel.token) {
                        fireMetaCAPI(pixel, 'VideoView75', customData);
                      }
                    });
                    
                    // Disparar para Google Ads e Analytics
                    pixelsRef.current.forEach(pixel => {
                      if (pixel.type === 'google_ads') {
                        fireGoogleAdsPixel(pixel, 'video_progress', {
                          video_title: customData.video_title,
                          video_url: customData.video_url,
                          video_percent: 75,
                          event_category: 'video',
                          event_label: 'Video 75%'
                        });
                      } else if (pixel.type === 'google_analytics') {
                        fireGoogleAnalyticsPixel(pixel, 'video_progress', {
                          video_title: customData.video_title,
                          video_url: customData.video_url,
                          video_percent: 75,
                          event_category: 'video',
                          event_label: 'Video 75%'
                        });
                      }
                    });
                  }
                }
              }
            });
          }
        }
      });
    };

    // Setup inicial de vídeos
    setupVideoTracking();

    // Observar novos vídeos adicionados dinamicamente
    const observer = new MutationObserver(() => {
      setupVideoTracking();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup function
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      window.removeEventListener('scroll', debouncedScroll);
      document.removeEventListener('click', handleClick, true);
      observer.disconnect();
    };
  };

  const fireMetaCAPI = async (pixel: Pixel, eventName: string = 'PageView', customData: Record<string, any> = {}) => {
    if (!pixel.pixel_id || !pixel.token) return;

    try {
      // Capturar dados do usuário
      const urlParams = new URLSearchParams(window.location.search);
      
      // Custom data base
      const baseCustomData: Record<string, any> = {
        content_name: document.title,
        content_category: 'landing_page',
        url: window.location.href,
        referrer: document.referrer || '',
        ...customData
      };

      // Adicionar parâmetros UTM se existirem
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      utmParams.forEach(param => {
        const value = urlParams.get(param);
        if (value) {
          baseCustomData[param] = value;
        }
      });

      // Obter todos os cookies do Facebook
      const fbp = getCookie('_fbp');
      const fbc = getCookie('_fbc');
      const fbid = getCookie('_fbid');

      // Construir user_data completo
      const userData: Record<string, any> = {
        client_user_agent: navigator.userAgent,
      };

      // Adicionar cookies do Facebook
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;
      if (fbid) userData.fbid = fbid;

      // Tentar obter IP
      try {
        const ip = await getClientIP();
        if (ip) userData.client_ip_address = ip;
      } catch {
        // Ignorar erro de IP
      }

      // External ID (pode ser obtido de parâmetros da URL ou localStorage)
      const externalId = urlParams.get('external_id') || 
                         urlParams.get('fbp')?.split('.')[2] || 
                         getCookie('external_id') ||
                         localStorage.getItem('external_id');
      if (externalId) {
        userData.external_id = externalId;
      }

      // Facebook Login ID (se disponível)
      const fbLoginId = urlParams.get('fb_login_id') || getCookie('fb_login_id');
      if (fbLoginId) {
        userData.fb_login_id = fbLoginId;
      }

      // Deduplication key (usando event_id único)
      const eventId = `${eventName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const trackingData: Record<string, any> = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_id: eventId, // Chave de desduplicação
        user_data: userData,
        custom_data: baseCustomData,
        event_source_url: window.location.href,
      };

      // Enviar para Meta Conversions API
      const response = await fetch(`https://graph.facebook.com/v18.0/${pixel.pixel_id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [trackingData],
          access_token: pixel.token,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao enviar para Meta CAPI:', errorText);
      }
    } catch (error) {
      console.error('Erro ao disparar Meta CAPI:', error);
    }
  };

  const fireGoogleAdsPixel = (pixel: Pixel, eventName: string = 'page_view', eventParams: Record<string, any> = {}) => {
    if (!pixel.pixel_id) return;

    // Google Ads Conversion Tracking
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${pixel.pixel_id}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }

    // Capturar dados completos do usuário
    const urlParams = new URLSearchParams(window.location.search);
    
    // Configuração completa com todos os parâmetros
    const configParams: Record<string, any> = {
      page_path: window.location.pathname,
      page_location: window.location.href,
      page_title: document.title,
      send_page_view: eventName === 'page_view',
      // Enhanced Conversions - melhor qualidade de dados
      allow_google_signals: true,
      allow_ad_personalization_signals: true,
      // Informações adicionais
      custom_map: {},
    };

    // Adicionar parâmetros UTM
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    utmParams.forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        configParams[param] = value;
      }
    });

    // Adicionar gclid se existir
    const gclid = urlParams.get('gclid');
    if (gclid) {
      configParams.gclid = gclid;
    }

    // Configurar o pixel com todos os parâmetros
    window.gtag('config', pixel.pixel_id, configParams);

    // Parâmetros do evento com todas as informações possíveis
    const eventData: Record<string, any> = {
      page_path: window.location.pathname,
      page_location: window.location.href,
      page_title: document.title,
      referrer: document.referrer || '',
      // Informações do usuário
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      ...eventParams
    };

    // Adicionar UTM ao evento também
    utmParams.forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        eventData[param] = value;
      }
    });

    // Disparar evento
    window.gtag('event', eventName, eventData);
  };

  const fireGoogleAnalyticsPixel = (pixel: Pixel, eventName: string = 'page_view', eventParams: Record<string, any> = {}) => {
    if (!pixel.pixel_id) return;

    // Google Analytics 4
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${pixel.pixel_id}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
    }

    // Capturar dados completos do usuário
    const urlParams = new URLSearchParams(window.location.search);
    
    // Configuração completa com todos os parâmetros
    const configParams: Record<string, any> = {
      page_path: window.location.pathname,
      page_location: window.location.href,
      page_title: document.title,
      send_page_view: eventName === 'page_view',
      // Enhanced measurement
      allow_google_signals: true,
      allow_ad_personalization_signals: true,
    };

    // Adicionar parâmetros UTM
    const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    utmParams.forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        configParams[param] = value;
      }
    });

    // Adicionar gclid se existir
    const gclid = urlParams.get('gclid');
    if (gclid) {
      configParams.gclid = gclid;
    }

    // Configurar o pixel com todos os parâmetros
    window.gtag('config', pixel.pixel_id, configParams);

    // Parâmetros do evento com todas as informações possíveis
    const eventData: Record<string, any> = {
      page_path: window.location.pathname,
      page_location: window.location.href,
      page_title: document.title,
      referrer: document.referrer || '',
      // Informações do usuário
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      ...eventParams
    };

    // Adicionar UTM ao evento também
    utmParams.forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        eventData[param] = value;
      }
    });

    // Disparar evento
    window.gtag('event', eventName, eventData);
  };

  const getCookie = (name: string): string => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '';
    }
  };
}

// Declarações de tipos para TypeScript
declare global {
  interface Window {
    fbq?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

