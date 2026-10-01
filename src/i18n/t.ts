import i18n from './index';

/**
 * Tradução para uso fora de hooks (handlers, toasts, JSX em qualquer componente).
 * A árvore da app é remontada ao trocar de idioma (ver LanguageRoot), então
 * chamadas feitas durante a renderização refletem o idioma atual.
 * Não use em constantes de nível de módulo — elas são avaliadas uma única vez.
 */
export const tx = (key: string, options?: Record<string, unknown>): string => {
  const result = i18n.t(key, options as any);
  // Fallback final: nunca devolver vazio, nulo ou não-string — usa a chave
  // (que é a frase em português) para a tela nunca ficar em branco.
  const out = typeof result === 'string' && result.trim().length > 0 ? result : key;
  // Se a chave não tem tradução, o i18next pode devolvê-la sem interpolar.
  return options && out.includes('{{')
    ? out.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in options ? String(options[k] ?? '') : m))
    : out;
};
