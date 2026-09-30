import i18n from './index';

/**
 * Tradução para uso fora de hooks (handlers, toasts, JSX em qualquer componente).
 * A árvore da app é remontada ao trocar de idioma (ver LanguageRoot), então
 * chamadas feitas durante a renderização refletem o idioma atual.
 * Não use em constantes de nível de módulo — elas são avaliadas uma única vez.
 */
export const tx = (key: string, options?: Record<string, unknown>): string =>
  i18n.t(key, options as any) as string;
