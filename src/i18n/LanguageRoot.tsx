import { ReactNode, useEffect, useState } from 'react';
import i18n from './index';

/** Remonta a árvore quando o idioma muda, para que todas as telas usem o novo idioma. */
export function LanguageRoot({ children }: { children: ReactNode }) {
  const [lng, setLng] = useState(i18n.language);
  useEffect(() => {
    const onChange = (l: string) => setLng(l);
    i18n.on('languageChanged', onChange);
    return () => { i18n.off('languageChanged', onChange); };
  }, []);
  return <div key={lng} className="contents">{children}</div>;
}
