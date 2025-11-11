import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Settings, LogOut, Plus, Trash2, Calendar, Link, Code, Facebook, Search, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MONTEO_COMPANY_ID = '62855c99-3a9a-41a1-80bd-b4ea8d2a22b1';

interface Pixel {
  id: string;
  type: 'meta_ads' | 'google_ads' | 'google_analytics';
  pixel_id: string;
  token?: string; // Apenas para meta_ads
}

interface EventSettings {
  id?: string;
  event_date: string;
  redirect_url: string;
  form_code: string;
  form_iframe_url?: string;
  pixels: Pixel[];
}

export default function ConfiguracoesPage() {
  const { user, crmUser, loading, signOut, isAuthorized } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<EventSettings>({
    event_date: '',
    redirect_url: '',
    form_code: '',
    form_iframe_url: '',
    pixels: []
  });

  // Função para extrair URL do iframe do código HTML
  const extractIframeUrl = (htmlCode: string): string | null => {
    if (!htmlCode) return null;
    
    // Tentar encontrar src do iframe usando regex
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/i;
    const match = htmlCode.match(iframeRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Tentar encontrar src mesmo se estiver em múltiplas linhas
    const multilineRegex = /<iframe[^>]*\s+src\s*=\s*["']([^"']+)["']/is;
    const multilineMatch = htmlCode.match(multilineRegex);
    
    if (multilineMatch && multilineMatch[1]) {
      return multilineMatch[1];
    }
    
    return null;
  };
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAuthorized)) {
      navigate('/login');
    }
  }, [user, loading, isAuthorized, navigate]);

  useEffect(() => {
    if (user && isAuthorized) {
      loadSettings();
    }
  }, [user, isAuthorized]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('event_page_settings')
        .select('*')
        .eq('company_id', MONTEO_COMPANY_ID)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Erro ao carregar configurações:', error);
      } else if (data) {
        // Se não tiver form_iframe_url salvo, tentar extrair do form_code
        let formIframeUrl = data.form_iframe_url || '';
        if (!formIframeUrl && data.form_code) {
          formIframeUrl = extractIframeUrl(data.form_code) || '';
        }
        
        // Converter timestamp para formato datetime-local (YYYY-MM-DDTHH:mm)
        // A data no banco está em UTC, precisamos exibir no timezone local do navegador
        let eventDateValue = '';
        if (data.event_date) {
          const utcDate = new Date(data.event_date);
          if (!isNaN(utcDate.getTime())) {
            // O campo datetime-local trabalha no timezone local do navegador
            // A data já vem em UTC do banco, o JavaScript converte automaticamente para o timezone local
            const localDate = new Date(utcDate);
            
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const hours = String(localDate.getHours()).padStart(2, '0');
            const minutes = String(localDate.getMinutes()).padStart(2, '0');
            eventDateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
        
        setSettings({
          event_date: eventDateValue,
          redirect_url: data.redirect_url || '',
          form_code: data.form_code || '',
          form_iframe_url: formIframeUrl,
          pixels: data.pixels || []
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Extrair URL do iframe do código HTML
      const extractedUrl = extractIframeUrl(settings.form_code);
      
      // Converter datetime-local para timestamp UTC
      let eventDateTimestamp = null;
      if (settings.event_date) {
        // datetime-local retorna uma string no formato YYYY-MM-DDTHH:mm
        // O campo já trabalha no timezone local do navegador
        // Precisamos criar a data no timezone local e converter para UTC
        const localDate = new Date(settings.event_date);
        
        if (!isNaN(localDate.getTime())) {
          // Converter para UTC (o toISOString() já faz isso)
          eventDateTimestamp = localDate.toISOString();
        }
      }
      
      const { error } = await supabase
        .from('event_page_settings')
        .upsert({
          company_id: MONTEO_COMPANY_ID,
          event_date: eventDateTimestamp,
          redirect_url: settings.redirect_url || null,
          form_code: settings.form_code || null,
          form_iframe_url: extractedUrl || null,
          pixels: settings.pixels
        }, {
          onConflict: 'company_id'
        });

      if (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar configurações. Tente novamente.');
      } else {
        alert('Configurações salvas com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const addPixel = (type: Pixel['type']) => {
    const newPixel: Pixel = {
      id: crypto.randomUUID(),
      type,
      pixel_id: '',
      ...(type === 'meta_ads' && { token: '' })
    };
    setSettings({
      ...settings,
      pixels: [...settings.pixels, newPixel]
    });
  };

  const removePixel = (pixelId: string) => {
    setSettings({
      ...settings,
      pixels: settings.pixels.filter(p => p.id !== pixelId)
    });
  };

  const updatePixel = (pixelId: string, field: keyof Pixel, value: string) => {
    setSettings({
      ...settings,
      pixels: settings.pixels.map(p =>
        p.id === pixelId ? { ...p, [field]: value } : p
      )
    });
  };

  const getUserDisplayName = () => {
    if (crmUser) {
      const firstName = crmUser.first_name || '';
      const lastName = crmUser.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || user?.email || 'Usuário';
    }
    return user?.email || 'Usuário';
  };

  const getPixelIcon = (type: Pixel['type']) => {
    switch (type) {
      case 'meta_ads':
        return <Facebook size={20} className="text-white" />;
      case 'google_ads':
        return <Search size={20} className="text-white" />;
      case 'google_analytics':
        return <BarChart3 size={20} className="text-white" />;
    }
  };

  const getPixelLabel = (type: Pixel['type']) => {
    switch (type) {
      case 'meta_ads':
        return 'Meta Ads';
      case 'google_ads':
        return 'Google Ads';
      case 'google_analytics':
        return 'Google Analytics';
    }
  };

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#131313' }}>
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#131313' }}>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Card Principal */}
          <div 
            className="rounded-lg overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #A87056, rgba(168, 112, 86, 0.8))',
              padding: '0.5px',
              boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
            }}
          >
            <div 
              className="rounded-lg p-8"
              style={{
                background: 'linear-gradient(180deg, #131313, #1E1E1E)'
              }}
            >
              <div className="flex items-center justify-center mb-6">
                <div 
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#A87056'
                  }}
                >
                  <Settings className="text-white" size={32} />
                </div>
              </div>

              <h1 className="text-white text-3xl font-bold text-center mb-8">
                Configurações da página
              </h1>

              {/* Mensagem de Boas-vindas */}
              <div className="mb-8">
                <div 
                  className="rounded-lg p-6"
                  style={{
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #333333'
                  }}
                >
                  <p className="text-white text-center">
                    Bem-vindo, {getUserDisplayName()}
                  </p>
                </div>
              </div>

              {/* Seção: Informações do Evento */}
              <div className="mb-8">
                <h2 className="text-white text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="text-#A87056" size={24} style={{ color: '#A87056' }} />
                  Informações do evento
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-sm mb-2">Data e hora do evento</label>
                    <input
                      type="datetime-local"
                      value={settings.event_date}
                      onChange={(e) => setSettings({ ...settings, event_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg text-white transition-colors duration-200"
                      style={{
                        backgroundColor: '#2A2A2A',
                        border: '1px solid #353535',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#A87056'}
                      onBlur={(e) => e.target.style.borderColor = '#353535'}
                    />
                    <p className="text-gray-400 text-xs mt-1">Horário de Brasília (UTC-3)</p>
                  </div>

                  <div>
                    <label className="block text-white text-sm mb-2 flex items-center gap-2">
                      <Link size={16} style={{ color: '#A87056' }} />
                      URL de redirecionamento
                    </label>
                    <input
                      type="url"
                      value={settings.redirect_url}
                      onChange={(e) => setSettings({ ...settings, redirect_url: e.target.value })}
                      placeholder="https://exemplo.com/obrigado"
                      className="w-full px-4 py-3 rounded-lg text-white transition-colors duration-200"
                      style={{
                        backgroundColor: '#2A2A2A',
                        border: '1px solid #353535',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#A87056'}
                      onBlur={(e) => e.target.style.borderColor = '#353535'}
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm mb-2 flex items-center gap-2">
                      <Code size={16} style={{ color: '#A87056' }} />
                      Código do formulário
                    </label>
                    <textarea
                      value={settings.form_code}
                      onChange={(e) => {
                        const newCode = e.target.value;
                        const extractedUrl = extractIframeUrl(newCode);
                        setSettings({ 
                          ...settings, 
                          form_code: newCode,
                          form_iframe_url: extractedUrl || settings.form_iframe_url || ''
                        });
                      }}
                      placeholder="Cole aqui o código do formulário..."
                      rows={8}
                      className="w-full px-4 py-3 rounded-lg text-white transition-colors duration-200 font-mono text-sm"
                      style={{
                        backgroundColor: '#2A2A2A',
                        border: '1px solid #353535',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#A87056'}
                      onBlur={(e) => e.target.style.borderColor = '#353535'}
                    />
                    {settings.form_iframe_url && (
                      <div className="mt-2 p-3 rounded-lg text-sm" style={{ 
                        backgroundColor: 'rgba(168, 112, 86, 0.1)', 
                        border: '1px solid rgba(168, 112, 86, 0.3)',
                        color: '#A87056'
                      }}>
                        <strong>URL detectada:</strong> {settings.form_iframe_url}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção: Pixels */}
              <div className="mb-8">
                <h2 className="text-white text-xl font-semibold mb-4">Pixels</h2>
                
                {/* Meta Ads */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <Facebook size={20} style={{ color: '#A87056' }} />
                      Meta Ads
                    </h3>
                    <button
                      onClick={() => addPixel('meta_ads')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all duration-300 hover:opacity-90"
                      style={{
                        backgroundColor: '#A87056',
                        boxShadow: '0 2px 10px rgba(168, 112, 86, 0.4)'
                      }}
                    >
                      <Plus size={16} />
                      Adicionar Pixel
                    </button>
                  </div>
                  
                  {settings.pixels.filter(p => p.type === 'meta_ads').map((pixel) => (
                    <div key={pixel.id} className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#1E1E1E', border: '1px solid #333333' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getPixelIcon(pixel.type)}
                          <span className="text-white font-medium">{getPixelLabel(pixel.type)}</span>
                        </div>
                        <button
                          onClick={() => removePixel(pixel.id)}
                          className="p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-white text-xs mb-1">Pixel ID</label>
                          <input
                            type="text"
                            value={pixel.pixel_id}
                            onChange={(e) => updatePixel(pixel.id, 'pixel_id', e.target.value)}
                            placeholder="Digite o Pixel ID"
                            className="w-full px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                            style={{
                              backgroundColor: '#2A2A2A',
                              border: '1px solid #353535',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#A87056'}
                            onBlur={(e) => e.target.style.borderColor = '#353535'}
                          />
                        </div>
                        <div>
                          <label className="block text-white text-xs mb-1">Token de Pixel API</label>
                          <input
                            type="text"
                            value={pixel.token || ''}
                            onChange={(e) => updatePixel(pixel.id, 'token', e.target.value)}
                            placeholder="Digite o Token de Pixel API"
                            className="w-full px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                            style={{
                              backgroundColor: '#2A2A2A',
                              border: '1px solid #353535',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#A87056'}
                            onBlur={(e) => e.target.style.borderColor = '#353535'}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Google Ads */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <Search size={20} style={{ color: '#A87056' }} />
                      Google Ads
                    </h3>
                    <button
                      onClick={() => addPixel('google_ads')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all duration-300 hover:opacity-90"
                      style={{
                        backgroundColor: '#A87056',
                        boxShadow: '0 2px 10px rgba(168, 112, 86, 0.4)'
                      }}
                    >
                      <Plus size={16} />
                      Adicionar Pixel
                    </button>
                  </div>
                  
                  {settings.pixels.filter(p => p.type === 'google_ads').map((pixel) => (
                    <div key={pixel.id} className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#1E1E1E', border: '1px solid #333333' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getPixelIcon(pixel.type)}
                          <span className="text-white font-medium">{getPixelLabel(pixel.type)}</span>
                        </div>
                        <button
                          onClick={() => removePixel(pixel.id)}
                          className="p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-white text-xs mb-1">Pixel ID</label>
                        <input
                          type="text"
                          value={pixel.pixel_id}
                          onChange={(e) => updatePixel(pixel.id, 'pixel_id', e.target.value)}
                          placeholder="Digite o Pixel ID"
                          className="w-full px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                          style={{
                            backgroundColor: '#2A2A2A',
                            border: '1px solid #353535',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#A87056'}
                          onBlur={(e) => e.target.style.borderColor = '#353535'}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Google Analytics */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <BarChart3 size={20} style={{ color: '#A87056' }} />
                      Google Analytics
                    </h3>
                    <button
                      onClick={() => addPixel('google_analytics')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all duration-300 hover:opacity-90"
                      style={{
                        backgroundColor: '#A87056',
                        boxShadow: '0 2px 10px rgba(168, 112, 86, 0.4)'
                      }}
                    >
                      <Plus size={16} />
                      Adicionar Pixel
                    </button>
                  </div>
                  
                  {settings.pixels.filter(p => p.type === 'google_analytics').map((pixel) => (
                    <div key={pixel.id} className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#1E1E1E', border: '1px solid #333333' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getPixelIcon(pixel.type)}
                          <span className="text-white font-medium">{getPixelLabel(pixel.type)}</span>
                        </div>
                        <button
                          onClick={() => removePixel(pixel.id)}
                          className="p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-white text-xs mb-1">Pixel ID</label>
                        <input
                          type="text"
                          value={pixel.pixel_id}
                          onChange={(e) => updatePixel(pixel.id, 'pixel_id', e.target.value)}
                          placeholder="Digite o Pixel ID"
                          className="w-full px-3 py-2 rounded-lg text-white text-sm transition-colors duration-200"
                          style={{
                            backgroundColor: '#2A2A2A',
                            border: '1px solid #353535',
                            outline: 'none'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#A87056'}
                          onBlur={(e) => e.target.style.borderColor = '#353535'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#A87056',
                    boxShadow: '0 4px 20px rgba(168, 112, 86, 0.4)'
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:opacity-90"
                  style={{
                    backgroundColor: '#dc2626',
                    boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)'
                  }}
                >
                  <LogOut size={20} />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
