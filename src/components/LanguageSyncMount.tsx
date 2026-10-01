import { useLanguageSync } from '@/hooks/useLanguageSync';

/** Monta a sincronização de idioma com a conta (sem renderizar nada). */
export function LanguageSyncMount() {
  useLanguageSync();
  return null;
}
