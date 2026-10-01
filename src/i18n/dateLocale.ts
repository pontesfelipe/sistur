import { ptBR, enUS, es } from 'date-fns/locale';
import i18n from './index';

/** Locale do date-fns conforme o idioma atual da plataforma. */
export const getDateLocale = () => {
  const l = i18n.language || 'pt-BR';
  if (l.startsWith('en')) return enUS;
  if (l.startsWith('es')) return es;
  return ptBR;
};

/** Locale BCP-47 para Intl/toLocaleDateString conforme o idioma atual. */
export const getIntlLocale = () => {
  const l = i18n.language || 'pt-BR';
  if (l.startsWith('en')) return 'en-US';
  if (l.startsWith('es')) return 'es-ES';
  return 'pt-BR';
};
