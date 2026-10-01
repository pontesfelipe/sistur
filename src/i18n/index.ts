import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * i18n do SISTUR.
 * Esquema: a própria frase em português é a chave (pt-BR é o idioma-fonte).
 * Textos sem tradução em en/es caem automaticamente no português,
 * o que permite migrar tela a tela sem quebrar nada.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português', short: 'PT' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export const LANGUAGE_STORAGE_KEY = 'sistur-lang';

function detectInitial(): AppLanguage {
  if (typeof window === 'undefined') return 'pt-BR';
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) return saved as AppLanguage;
  return 'pt-BR';
}

/**
 * Frases geradas pelo cálculo (gravadas em português no banco) são
 * traduzidas por partes quando não existe tradução inteira.
 */
const GENERATED_PATTERNS: Array<[RegExp, string]> = [
  [/^(.+) em nível (\S+) \((.+)\) — Interpretação: (.+)$/, '{{0}} em nível {{1}} ({{2}}) — Interpretação: {{3}}'],
  [/^Esta capacitação foi prescrita porque o indicador (.+) está (\S+) no pilar (.+?)\.(.*)$/, 'Esta capacitação foi prescrita porque o indicador {{0}} está {{1}} no pilar {{2}}.{{3}}'],
  [/^Prescrito porque o indicador (.+) está (\S+) no pilar (.+?)\.(.*)$/, 'Prescrito porque o indicador {{0}} está {{1}} no pilar {{2}}.{{3}}'],
  [/^Esta capacitação foi prescrita porque o indicador (.+) está (\S+) — (.+)$/, 'Esta capacitação foi prescrita porque o indicador {{0}} está {{1}} — {{2}}'],
  [/^Evidência: (.+)$/, 'Evidência: {{0}}'],
];
let translatingGenerated = false;
function translateGenerated(key: string): string {
  if (translatingGenerated || !i18n.language || i18n.language === 'pt-BR') return key;
  for (const [re, template] of GENERATED_PATTERNS) {
    const m = key.match(re);
    if (!m) continue;
    translatingGenerated = true;
    try {
      const vars: Record<string, string> = {};
      m.slice(1).forEach((part, i) => {
        const p = part.trim();
        vars[String(i)] = p ? part.replace(p, String(i18n.t(p))) : part;
      });
      translatingGenerated = false;
      return String(i18n.t(template, { ...vars, interpolation: { escapeValue: false } }));
    } finally { translatingGenerated = false; }
  }
  return key;
}

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: {} },
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectInitial(),
  fallbackLng: 'pt-BR',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  returnNull: false,
  saveMissing: false,
  // Garantia extra: se uma chave estiver ausente (ou vazia/nula) em en/es,
  // o i18next cai no pt-BR e, como o recurso pt-BR é vazio, devolve a própria
  // chave — que é a frase em português. Ou seja, a tela nunca fica vazia
  // nem mostra códigos crus de tradução.
  parseMissingKeyHandler: (key) => translateGenerated(key),
  missingKeyHandler: (_lngs, _ns, key) => {
    if (import.meta.env.DEV) console.warn(`[i18n] tradução ausente: "${key}"`);
  },
});

const applyHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
};
applyHtmlLang(i18n.language);
i18n.on('languageChanged', (lng) => {
  applyHtmlLang(lng);
  try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lng); } catch { /* ignore */ }
});

/** Idioma atual para enviar às funções de IA / e-mail. */
export const getCurrentLanguage = (): AppLanguage =>
  (SUPPORTED_LANGUAGES.some((l) => l.code === i18n.language) ? i18n.language : 'pt-BR') as AppLanguage;

export default i18n;
