-- v1.38.71 — Permitir edição do conteúdo de relatórios pelo dono ou ADMIN
CREATE POLICY "Owners and admins can update reports"
ON public.generated_reports
FOR UPDATE
TO authenticated
USING (
  user_belongs_to_org(auth.uid(), org_id)
  AND (created_by = auth.uid() OR has_role(auth.uid(), 'ADMIN'::app_role))
)
WITH CHECK (
  user_belongs_to_org(auth.uid(), org_id)
  AND (created_by = auth.uid() OR has_role(auth.uid(), 'ADMIN'::app_role))
);

-- Trilha de auditoria mínima quando o relatório é editado manualmente
ALTER TABLE public.generated_reports
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_by uuid;