import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDestinationsTool from "./tools/list-destinations";
import listAssessmentsTool from "./tools/list-assessments";
import getAssessmentTool from "./tools/get-assessment";
import listProjectsTool from "./tools/list-projects";
import listProjectTasksTool from "./tools/list-project-tasks";
import createProjectTaskTool from "./tools/create-project-task";
import listTrainingsTool from "./tools/list-trainings";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "sistur",
  title: "SISTUR",
  version: "1.0.0",
  instructions:
    "Ferramentas do SISTUR (Sistema Integrado de Suporte para Turismo em Regiões). Consulte destinos, diagnósticos territoriais e empresariais com notas por pilar (RA, OE, AO), projetos e suas tarefas, e o catálogo de capacitações. Todos os dados são escopados ao usuário autenticado e à sua organização. Percentuais já vêm em escala 0-100.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listDestinationsTool,
    listAssessmentsTool,
    getAssessmentTool,
    listProjectsTool,
    listProjectTasksTool,
    createProjectTaskTool,
    listTrainingsTool,
  ],
});
