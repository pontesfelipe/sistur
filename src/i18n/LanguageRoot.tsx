import { ReactNode, useEffect } from 'react';
import i18n from './index';

/**
 * Ao trocar de idioma, recarrega a página atual (mesma URL) para que todas as
 * telas — inclusive textos calculados fora de hooks — usem o novo idioma.
 */
export function LanguageRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onChange = () => {
      // Pequena tolerância para que a gravação do idioma na conta
      // (useLanguageSync) complete antes do recarregamento.
      window.setTimeout(() => window.location.reload(), 400);
    };
    i18n.on('languageChanged', onChange);
    return () => { i18n.off('languageChanged', onChange); };
  }, []);
  return <>{children}</>;
}
