import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MONTEO_COMPANY_ID = '62855c99-3a9a-41a1-80bd-b4ea8d2a22b1';

// Data padrão (fallback)
const DEFAULT_EVENT_DATE = new Date(2025, 10, 19, 19, 0, 0); // 19 de Novembro de 2025 às 19h
const DEFAULT_EVENT_DATE_FORMATTED = "19 de Novembro de 2025 às 19:00 horas";

export function useEventSettings() {
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventDateFormatted, setEventDateFormatted] = useState<string>(DEFAULT_EVENT_DATE_FORMATTED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventDate();
  }, []);

  const formatDateInPortuguese = (date: Date): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day} de ${month} de ${year} às ${hours}:${minutes} horas`;
  };

  const loadEventDate = async () => {
    try {
      const { data, error } = await supabase
        .from('event_page_settings')
        .select('event_date')
        .eq('company_id', MONTEO_COMPANY_ID)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar data do evento:', error);
      }

      if (data && data.event_date) {
        // Converter string de data para Date object
        // A data vem em UTC do banco, o JavaScript converte automaticamente para o timezone local
        const utcDate = new Date(data.event_date);
        if (!isNaN(utcDate.getTime())) {
          // O Date object já representa a data no timezone local do navegador
          // Não precisamos fazer conversão manual, o JavaScript faz isso automaticamente
          setEventDate(utcDate);
          setEventDateFormatted(formatDateInPortuguese(utcDate));
        } else {
          // Se a data for inválida, usar padrão
          setEventDate(DEFAULT_EVENT_DATE);
          setEventDateFormatted(DEFAULT_EVENT_DATE_FORMATTED);
        }
      } else {
        // Se não houver data configurada, usar padrão
        setEventDate(DEFAULT_EVENT_DATE);
        setEventDateFormatted(DEFAULT_EVENT_DATE_FORMATTED);
      }
    } catch (error) {
      console.error('Erro ao carregar data do evento:', error);
      setEventDate(DEFAULT_EVENT_DATE);
      setEventDateFormatted(DEFAULT_EVENT_DATE_FORMATTED);
    } finally {
      setLoading(false);
    }
  };

  return { eventDate, eventDateFormatted, loading };
}

