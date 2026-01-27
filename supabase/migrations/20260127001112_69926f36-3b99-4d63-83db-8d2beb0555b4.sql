-- Corrigir política de DELETE para suportar demo mode e roles adicionais
DROP POLICY IF EXISTS "Admins can delete reports" ON public.generated_reports;

CREATE POLICY "Users can delete reports in their org"
ON public.generated_reports
FOR DELETE
USING (
  org_id = get_effective_org_id()
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role) 
    OR has_role(auth.uid(), 'ANALYST'::app_role)
  )
);

-- Garantir que projetos vinculados a relatórios excluídos tenham report_id nullificado
ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_report_id_fkey;

ALTER TABLE public.projects
ADD CONSTRAINT projects_report_id_fkey 
FOREIGN KEY (report_id) 
REFERENCES public.generated_reports(id) 
ON DELETE SET NULL;