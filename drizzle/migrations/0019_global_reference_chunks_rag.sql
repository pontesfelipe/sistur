CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.global_reference_files
  ADD COLUMN IF NOT EXISTS index_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS chunk_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS indexed_at timestamptz,
  ADD COLUMN IF NOT EXISTS index_error text;

CREATE TABLE public.global_reference_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.global_reference_files(id) ON DELETE CASCADE,
  page integer,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(1536),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', content)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.global_reference_chunks TO authenticated;
GRANT ALL ON public.global_reference_chunks TO service_role;
ALTER TABLE public.global_reference_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reference chunks" ON public.global_reference_chunks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE INDEX global_reference_chunks_ref_idx ON public.global_reference_chunks(reference_id, chunk_index);
CREATE INDEX global_reference_chunks_tsv_idx ON public.global_reference_chunks USING gin(tsv);
CREATE INDEX global_reference_chunks_emb_idx ON public.global_reference_chunks USING hnsw (embedding extensions.vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_reference_chunks(query_embedding extensions.vector(1536), query_text text, match_count int DEFAULT 3, min_similarity float DEFAULT 0.3)
RETURNS TABLE(id uuid, reference_id uuid, file_name text, page integer, content text, similarity float, score float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  WITH sem AS (
    SELECT c.id, 1 - (c.embedding <=> query_embedding) AS sim,
           row_number() OVER (ORDER BY c.embedding <=> query_embedding) AS r
    FROM global_reference_chunks c
    JOIN global_reference_files f ON f.id = c.reference_id AND f.is_active
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT 30
  ), kw AS (
    SELECT c.id, row_number() OVER (ORDER BY ts_rank(c.tsv, q) DESC) AS r
    FROM global_reference_chunks c
    JOIN global_reference_files f ON f.id = c.reference_id AND f.is_active,
         websearch_to_tsquery('portuguese', coalesce(query_text,'')) q
    WHERE c.tsv @@ q
    ORDER BY ts_rank(c.tsv, q) DESC
    LIMIT 30
  ), fused AS (
    SELECT coalesce(sem.id, kw.id) AS id,
           coalesce(1.0/(60+sem.r),0) + coalesce(1.0/(60+kw.r),0) AS score,
           sem.sim
    FROM sem FULL OUTER JOIN kw ON sem.id = kw.id
  )
  SELECT c.id, c.reference_id, f.file_name, c.page, c.content,
         coalesce(fu.sim, 1 - (c.embedding <=> query_embedding))::float, fu.score::float
  FROM fused fu
  JOIN global_reference_chunks c ON c.id = fu.id
  JOIN global_reference_files f ON f.id = c.reference_id
  WHERE coalesce(fu.sim, 1 - (c.embedding <=> query_embedding)) >= min_similarity
  ORDER BY fu.score DESC
  LIMIT match_count;
$$;
REVOKE EXECUTE ON FUNCTION public.match_reference_chunks FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_reference_chunks TO service_role;