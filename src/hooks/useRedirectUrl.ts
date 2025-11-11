import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MONTEO_COMPANY_ID = '62855c99-3a9a-41a1-80bd-b4ea8d2a22b1';
const DEFAULT_REDIRECT_URL = 'https://wa.me/5511999999999'; // Fallback para WhatsApp

export function useRedirectUrl() {
  const [redirectUrl, setRedirectUrl] = useState<string>(DEFAULT_REDIRECT_URL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRedirectUrl();
  }, []);

  const loadRedirectUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('event_page_settings')
        .select('redirect_url')
        .eq('company_id', MONTEO_COMPANY_ID)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar URL de redirecionamento:', error);
      }

      if (data && data.redirect_url) {
        setRedirectUrl(data.redirect_url);
      } else {
        // Se não houver URL configurada, usar fallback
        setRedirectUrl(DEFAULT_REDIRECT_URL);
      }
    } catch (error) {
      console.error('Erro ao carregar URL de redirecionamento:', error);
      setRedirectUrl(DEFAULT_REDIRECT_URL);
    } finally {
      setLoading(false);
    }
  };

  return { redirectUrl, loading };
}

