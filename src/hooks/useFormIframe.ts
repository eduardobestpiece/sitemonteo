import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MONTEO_COMPANY_ID = '62855c99-3a9a-41a1-80bd-b4ea8d2a22b1';
const DEFAULT_FORM_URL = 'https://www.bpsales.com.br/form/c8b6c593-f941-4c9f-874a-1cb7d83e28c5?v=1762539888901&r=xlzlb7u';

export function useFormIframe() {
  const [formUrl, setFormUrl] = useState<string>(DEFAULT_FORM_URL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFormUrl();
  }, []);

  const loadFormUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('event_page_settings')
        .select('form_iframe_url')
        .eq('company_id', MONTEO_COMPANY_ID)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar URL do formulário:', error);
      } else if (data && data.form_iframe_url) {
        setFormUrl(data.form_iframe_url);
      }
    } catch (error) {
      console.error('Erro ao carregar URL do formulário:', error);
    } finally {
      setLoading(false);
    }
  };

  return { formUrl, loading };
}

