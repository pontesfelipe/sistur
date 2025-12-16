import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata o nome de um indicador para exibição mais amigável
 * - Remove prefixos como "IGMA", "Indicador adicional IGMA"
 * - Remove sufixos como "— a confirmar", "#N"
 * - Limpa caracteres desnecessários
 * - Capitaliza adequadamente
 */
export function formatIndicatorName(name: string): string {
  if (!name) return '';
  
  let formatted = name
    // Remove prefixos comuns de IGMA
    .replace(/^Indicador\s+adicional\s+IGMA\s*/i, '')
    .replace(/^IGMA\s*[-—:]\s*/i, '')
    .replace(/\(IGMA\)/gi, '')
    // Remove sufixos de confirmação
    .replace(/\s*[-—]\s*a\s+confirmar\s*$/i, '')
    .replace(/\s*#\d+\s*$/i, '')
    // Remove parênteses vazios ou com espaços
    .replace(/\(\s*\)/g, '')
    // Limpa espaços extras
    .replace(/\s+/g, ' ')
    .trim();
  
  // Se ficou muito curto ou vazio após limpeza, usa o original
  if (formatted.length < 3) {
    formatted = name;
  }
  
  // Capitaliza primeira letra se começar com minúscula
  if (formatted.charAt(0) === formatted.charAt(0).toLowerCase()) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  
  return formatted;
}

/**
 * Formata o código de um indicador para exibição
 * - Converte underscores para espaços se for um código longo
 * - Mantém códigos curtos como RA001, OE002 intactos
 */
export function formatIndicatorCode(code: string): string {
  if (!code) return '';
  
  // Códigos curtos padrão (ex: RA001, OE002) ficam intactos
  if (/^[A-Z]{2}\d{3}$/.test(code)) {
    return code;
  }
  
  // Códigos longos com underscores são formatados
  return code
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}
