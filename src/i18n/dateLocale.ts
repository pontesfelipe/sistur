import { ptBR, enUS, es } from 'date-fns/locale';
import i18n from './index';

/** Locale do date-fns conforme o idioma atual da plataforma. */
export const getDateLocale = () => {
  const l = i18n.language || 'pt-BR';
  if (l.startsWith('en')) return enUS;
  if (l.startsWith('es')) return es;
  return ptBR;
};
