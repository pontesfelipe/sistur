import i18n from './index';
import en from './locales/en.json';
import es from './locales/es.json';

/**
 * Rede de segurança de tradução.
 *
 * Muitos textos fixos ficam em listas/constantes de módulo (FAQ, ajuda,
 * tutoriais, jogos) que não passam por t(). Quando o idioma não é pt-BR,
 * este observador percorre a tela e troca qualquer texto (ou atributo
 * placeholder/title/aria-label) que seja exatamente uma frase do
 * dicionário pela tradução. Campos editáveis nunca são tocados.
 */
const DICTS: Record<string, Record<string, string>> = { en, es };
const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT']);

let maps: Map<string, string> | null = null;
let reverse: Set<string> | null = null;
let observer: MutationObserver | null = null;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

function buildMaps(lang: string) {
  const dict = DICTS[lang];
  maps = new Map();
  reverse = new Set();
  if (!dict) return;
  for (const [k, v] of Object.entries(dict)) {
    if (!v || k.includes('{{')) continue;
    maps.set(norm(k), v);
    reverse.add(norm(v));
  }
}

function skip(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName)) return true;
    if ((e as HTMLElement).isContentEditable) return true;
    if (e.hasAttribute?.('data-no-translate')) return true;
  }
  return false;
}

function translateText(node: Text) {
  const raw = node.nodeValue;
  if (!raw || raw.length < 2) return;
  const key = norm(raw);
  if (!key || reverse!.has(key)) return;
  const tr = maps!.get(key);
  if (!tr || tr === key) return;
  if (skip(node.parentElement)) return;
  const lead = raw.match(/^\s*/)![0];
  const trail = raw.match(/\s*$/)![0];
  node.nodeValue = lead + tr + trail;
}

function translateAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const tr = maps!.get(norm(v));
    if (tr && tr !== v) el.setAttribute(a, tr);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (SKIP_TAGS.has(el.tagName) && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
  translateAttrs(el);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = tw.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
    else translateAttrs(n as Element);
    n = tw.nextNode();
  }
}

function start(lang: string) {
  stop();
  if (typeof document === 'undefined' || !DICTS[lang]) return;
  buildMaps(lang);
  const run = () => {
    walk(document.body);
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') translateText(m.target as Text);
        else if (m.type === 'attributes') translateAttrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  };
  if (document.body) run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
}

function stop() {
  observer?.disconnect();
  observer = null;
}

export function initDomTranslator() {
  start(i18n.language);
  i18n.on('languageChanged', (lng) => start(lng));
}
