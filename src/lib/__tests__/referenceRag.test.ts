import { describe, it, expect } from 'vitest';
import { formatSourcesList, RELEVANCE_THRESHOLD } from '../../../supabase/functions/_shared/referenceRag';

const c = (file_name: string, page: number | null) => ({ id: Math.random().toString(), reference_id: 'r', file_name, page, content: '', similarity: 0.6, score: 0 });

describe('referenceRag', () => {
  it('agrupa páginas por documento, em ordem', () => {
    expect(formatSourcesList([c('PNT', 42), c('Política', 8), c('PNT', 7)])).toEqual(['PNT — páginas 7, 42', 'Política — página 8']);
  });
  it('trechos abaixo de 45% de similaridade não contam como relevantes', () => {
    expect(RELEVANCE_THRESHOLD).toBe(0.45);
  });
});
