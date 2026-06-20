/**
 * Catálogo interno de módulos lógicos do SISTUR.
 *
 * Cada entrada descreve um bloco funcional reutilizável, com arquivos-chave,
 * dependências internas e tabelas Supabase envolvidas. Usado pelo painel
 * "Biblioteca" em Configurações para permitir que desenvolvedores e agentes
 * de IA identifiquem e extraiam módulos completos para outros projetos.
 */

export type ModuleCategory =
  | 'ERP'
  | 'EDU'
  | 'Games'
  | 'Enterprise'
  | 'Comunidade'
  | 'Plataforma';

export interface ModuleManifest {
  module: string;
  category: ModuleCategory;
  description: string;
  files: string[];
  dependencies?: {
    hooks?: string[];
    contexts?: string[];
    ui?: string[];
  };
  supabaseTables?: string[];
  /**
   * Edge functions Supabase associadas ao módulo (caminhos relativos a
   * `supabase/functions/<name>/index.ts`).
   */
  edgeFunctions?: string[];
  /**
   * Rotas registradas em `src/App.tsx` que o módulo serve.
   */
  routes?: string[];
  /**
   * Palavras-chave para localizar migrations em `supabase/migrations/`.
   * Use o nome da tabela ou um identificador inequívoco do CREATE TABLE.
   */
  migrationKeywords?: string[];
  /**
   * Secrets / variáveis de ambiente exigidas em runtime (gateway, APIs).
   */
  secrets?: string[];
}

export interface ModuleSection {
  category: ModuleCategory;
  title: string;
  subtitle: string;
  modules: ModuleManifest[];
}

export const MODULE_LIBRARY: ModuleSection[] = [
  {
    category: 'ERP',
    title: 'ERP — Gestão Territorial',
    subtitle: 'Diagnóstico, planejamento e monitoramento de destinos',
    modules: [
      {
        module: 'Destinos',
        category: 'ERP',
        description: 'CRUD de destinos turísticos',
        files: [
          'src/pages/Destinos.tsx',
          'src/hooks/useDestinations.ts',
          'src/components/dashboard/',
        ],
        dependencies: {
          hooks: ['useAuth', 'useProfile'],
          contexts: ['ProfileContext'],
          ui: ['shadcn-ui', 'react-hook-form', 'zod'],
        },
        supabaseTables: ['destinations', 'municipalities'],
        routes: ['/destinos', '/destinos-publicos'],
        migrationKeywords: ['destinations', 'municipalities'],
        edgeFunctions: ['enrich-municipality-sidra', 'search-ibge'],
      },
      {
        module: 'Diagnósticos',
        category: 'ERP',
        description: 'Avaliação 3 pilares (RA/OE/AO), rodadas, importação de dados',
        files: [
          'src/pages/Diagnosticos.tsx',
          'src/pages/DiagnosticoDetalhe.tsx',
          'src/hooks/useAssessments.ts',
          'src/hooks/useIndicators.ts',
          'src/hooks/useCalculateAssessment.ts',
          'src/components/diagnostics/',
        ],
        dependencies: {
          hooks: ['useAuth', 'useProfile'],
          contexts: ['ProfileContext', 'LicenseContext'],
          ui: ['shadcn-ui', 'recharts', 'react-hook-form', 'zod'],
        },
        supabaseTables: ['assessments', 'indicators', 'indicator_values', 'assessment_rounds'],
        routes: ['/diagnosticos', '/diagnosticos/:id', '/nova-rodada'],
        migrationKeywords: ['assessments', 'indicators', 'indicator_values', 'assessment_rounds'],
        edgeFunctions: ['calculate-assessment'],
      },
      {
        module: 'Motor IGMA',
        category: 'ERP',
        description: 'Engine de interpretação sistêmica (6 regras de Beni)',
        files: [
          'src/lib/igmaEngine.ts',
          'src/lib/igmaEngine.test.ts',
          'src/components/dashboard/IGMAWarnings.tsx',
        ],
        dependencies: { ui: ['shadcn-ui'] },
      },
      {
        module: 'Projetos',
        category: 'ERP',
        description: 'Kanban, fases, milestones, orçamento, governança',
        files: [
          'src/pages/Projetos.tsx',
          'src/hooks/useProjects.ts',
          'src/hooks/useProjectBudget.ts',
          'src/hooks/useProjectGovernance.ts',
          'src/hooks/useProjectCollab.ts',
          'src/hooks/useProjectsPortfolio.ts',
          'src/hooks/useProjectExternalLinks.ts',
          'src/hooks/useProjectIndicatorLinks.ts',
          'src/components/projects/',
          'src/lib/projectGeneration.ts',
          'src/lib/projectExports.ts',
        ],
        dependencies: {
          hooks: ['useAuth', 'useProfile'],
          contexts: ['ProfileContext'],
          ui: ['shadcn-ui', 'framer-motion'],
        },
        supabaseTables: [
          'projects',
          'project_tasks',
          'project_members',
          'project_budget_lines',
          'project_checkpoints',
          'project_task_raci',
          'project_indicator_links',
          'project_external_links',
        ],
        routes: ['/projetos', '/minhas-tarefas'],
        migrationKeywords: ['projects', 'project_tasks', 'project_members', 'project_budget_lines', 'project_checkpoints', 'project_task_raci'],
        edgeFunctions: ['generate-project-structure', 'suggest-project-tasks'],
      },
      {
        module: 'Prescrições',
        category: 'ERP',
        description: 'Recomendações automáticas de aprendizado a partir do diagnóstico',
        files: [
          'src/hooks/usePrescriptions.ts',
          'src/hooks/useLearningRecommendations.ts',
          'src/hooks/useEduRecommendationsForAssessment.ts',
        ],
        supabaseTables: ['prescriptions', 'learning_recommendations'],
        migrationKeywords: ['prescriptions', 'learning_recommendations'],
      },
      {
        module: 'Relatórios',
        category: 'ERP',
        description: 'Geração e exportação de relatórios DOCX/ABNT',
        files: [
          'src/pages/Relatorios.tsx',
          'src/lib/exportReportDocx.ts',
          'src/lib/exportDocsDocx.ts',
          'src/lib/abntStyle.ts',
          'src/lib/reportStatusStyle.ts',
        ],
        dependencies: { ui: ['docx'] },
        supabaseTables: ['report_jobs', 'reports'],
        routes: ['/relatorios'],
        migrationKeywords: ['report_jobs', 'reports'],
        edgeFunctions: ['generate-report', 'process-report-job', 'check-report-semantic'],
        secrets: ['LOVABLE_API_KEY'],
      },
      {
        module: 'Observatório',
        category: 'ERP',
        description: 'Monitoramento territorial e alertas',
        files: [
          'src/pages/Observatorio.tsx',
          'src/hooks/useObservatorio.ts',
          'src/components/observatorio/',
          'src/lib/observatoryExport.ts',
        ],
        supabaseTables: ['observatory_metrics', 'observatory_alerts'],
        routes: ['/observatorio'],
        migrationKeywords: ['observatory_metrics', 'observatory_alerts'],
        edgeFunctions: ['ingest-observatory', 'notify-observatory-alert', 'discover-municipal-events'],
      },
      {
        module: 'Consórcios',
        category: 'ERP',
        description: 'Gestão de consórcios intermunicipais',
        files: [
          'src/pages/Consorcios.tsx',
          'src/pages/ConsorcioDetalhe.tsx',
          'src/hooks/useConsortia.ts',
          'src/components/consortia/',
        ],
        supabaseTables: ['consortia', 'consortium_members', 'consortium_invites'],
        routes: ['/consorcios', '/consorcios/:id'],
        migrationKeywords: ['consortia', 'consortium_members', 'consortium_invites'],
      },
      {
        module: 'Dados Oficiais',
        category: 'ERP',
        description: 'Ingestão IBGE, Mapa do Turismo, CADASTUR e outros',
        files: [
          'src/hooks/useOfficialData.ts',
          'src/hooks/useMapaTurismo.ts',
          'src/components/official-data/',
        ],
        supabaseTables: ['ibge_data', 'mapa_turismo', 'cadastur_data'],
        edgeFunctions: [
          'fetch-official-data',
          'ingest-ana',
          'ingest-anac',
          'ingest-anatel',
          'ingest-cadastur',
          'ingest-cadunico',
          'ingest-mapa-turismo',
          'ingest-tse',
          'ingest-youtube',
          'trigger-ingestion',
        ],
      },
    ],
  },
  {
    category: 'EDU',
    title: 'EDU — Plataforma de Aprendizado',
    subtitle: 'Cursos, trilhas, provas, certificação e gamificação',
    modules: [
      {
        module: 'Catálogo & Trilhas',
        category: 'EDU',
        description: 'Treinamentos, trilhas de aprendizado e trilhas adaptativas',
        files: [
          'src/pages/EduCatalogo.tsx',
          'src/pages/EduTrilhas.tsx',
          'src/pages/EduTrilhasAdaptativas.tsx',
          'src/hooks/useEdu.ts',
          'src/hooks/useEduTrainings.ts',
          'src/hooks/useAdaptiveLearningPaths.ts',
          'src/components/edu/',
        ],
        supabaseTables: ['trainings', 'learning_paths', 'lessons', 'enrollments'],
        routes: ['/edu', '/edu/catalogo', '/edu/trilhas', '/edu/trilhas-adaptativas', '/edu/training/:id'],
        migrationKeywords: ['trainings', 'learning_paths', 'lessons', 'enrollments'],
      },
      {
        module: 'Provas & Quizzes',
        category: 'EDU',
        description: 'Criação, aplicação e correção de provas',
        files: [
          'src/pages/ExamTaking.tsx',
          'src/pages/ExamReview.tsx',
          'src/pages/ExamHistory.tsx',
          'src/hooks/useExams.ts',
          'src/hooks/useQuizzes.ts',
          'src/hooks/useTrackExams.ts',
          'src/hooks/useExamHistory.ts',
          'src/components/admin/',
        ],
        supabaseTables: ['exams', 'exam_questions', 'exam_attempts', 'quizzes'],
        routes: ['/edu/exam/:examId', '/edu/exam-review/:attemptId', '/edu/minhas-provas'],
        migrationKeywords: ['exams', 'exam_questions', 'exam_attempts', 'quizzes'],
        edgeFunctions: ['cleanup-exam-tracking'],
      },
      {
        module: 'Turmas & Salas',
        category: 'EDU',
        description: 'Gestão de turmas, anúncios, diário e leaderboard',
        files: [
          'src/pages/EduMinhasTurmas.tsx',
          'src/hooks/useClassrooms.ts',
          'src/hooks/useClassroomAnnouncements.ts',
          'src/hooks/useClassroomEvents.ts',
          'src/hooks/useClassroomDiary.ts',
          'src/hooks/useClassroomLeaderboard.ts',
          'src/hooks/useClassroomOverview.ts',
        ],
        supabaseTables: ['classrooms', 'classroom_members', 'classroom_announcements', 'classroom_diary'],
        routes: ['/edu/turmas'],
        migrationKeywords: ['classrooms', 'classroom_members', 'classroom_diary'],
      },
      {
        module: 'Gamificação',
        category: 'EDU',
        description: 'XP, badges, conquistas, missões diárias e recompensas',
        files: [
          'src/pages/EduConquistas.tsx',
          'src/pages/EduRecompensas.tsx',
          'src/hooks/useEduGamification.ts',
          'src/hooks/useDailyMissions.ts',
          'src/hooks/useRewards.ts',
          'src/lib/awardXP.ts',
          'src/lib/autoClaimBadge.ts',
          'src/lib/shareAchievement.ts',
        ],
        supabaseTables: ['user_xp', 'badges', 'user_badges', 'daily_missions', 'rewards'],
        routes: ['/edu/conquistas', '/edu/recompensas'],
        migrationKeywords: ['badges', 'user_badges', 'daily_missions', 'rewards', 'user_xp'],
      },
      {
        module: 'Certificados',
        category: 'EDU',
        description: 'Geração e verificação pública de certificados',
        files: [
          'src/pages/Certificates.tsx',
          'src/pages/VerificarCertificado.tsx',
          'src/pages/VerifyCertificate.tsx',
          'src/hooks/useCertificates.ts',
        ],
        supabaseTables: ['certificates'],
        routes: ['/certificados', '/verificar-certificado', '/verificar-certificado/:code'],
        migrationKeywords: ['certificates'],
      },
      {
        module: 'Progresso & Boletim',
        category: 'EDU',
        description: 'Tracking de progresso, histórico escolar e notas',
        files: [
          'src/pages/EduHistoricoEscolar.tsx',
          'src/hooks/useEduProgress.ts',
          'src/hooks/useStudentTranscript.ts',
          'src/hooks/useStudentAssignments.ts',
          'src/hooks/useStudentProfile.ts',
          'src/hooks/useEduNotes.ts',
          'src/hooks/useAssignmentProgress.ts',
        ],
        supabaseTables: ['student_progress', 'student_grades', 'student_notes'],
        routes: ['/edu/historico', '/edu/boletim', '/edu/minhas-atividades'],
      },
      {
        module: 'Mensagens',
        category: 'EDU',
        description: 'Sistema de mensagens entre alunos e professores',
        files: [
          'src/pages/EduMensagens.tsx',
          'src/hooks/useEduMessages.ts',
          'src/hooks/useEduNotifications.ts',
        ],
        supabaseTables: ['edu_messages', 'edu_notifications'],
        routes: ['/edu/mensagens'],
        migrationKeywords: ['edu_messages', 'edu_notifications'],
      },
      {
        module: 'Painel do Professor',
        category: 'EDU',
        description: 'Dashboard de gestão para professores',
        files: [
          'src/pages/ProfessorDashboard.tsx',
          'src/hooks/useEduAdmin.ts',
          'src/hooks/useProfessorReferral.ts',
        ],
        routes: ['/professor', '/admin/edu', '/admin/certificacoes', '/admin/empacotamento'],
      },
    ],
  },
  {
    category: 'Games',
    title: 'Games — Hub de Jogos Educativos',
    subtitle: '4 jogos com sessões persistentes',
    modules: [
      {
        module: 'TCG (Card Game)',
        category: 'Games',
        description: 'Jogo de cartas estratégico com mecânicas de ameaças',
        files: [
          'src/pages/Game.tsx',
          'src/game/cardTypes.ts',
          'src/game/useCardGame.ts',
          'src/game/useGameState.ts',
          'src/game/components/',
          'src/game/threatCards.ts',
        ],
        routes: ['/game', '/game/tcg'],
      },
      {
        module: 'RPG',
        category: 'Games',
        description: 'Jogo narrativo de role-playing',
        files: [
          'src/pages/RPGGame.tsx',
          'src/rpg/types.ts',
          'src/rpg/components/',
        ],
        routes: ['/game/rpg'],
      },
      {
        module: 'Treasure Hunt',
        category: 'Games',
        description: 'Caça ao tesouro com mapas procedurais',
        files: [
          'src/pages/TreasureGame.tsx',
          'src/treasure/mapGenerator.ts',
          'src/treasure/types.ts',
          'src/treasure/components/',
        ],
        routes: ['/game/treasure'],
      },
      {
        module: 'Memory',
        category: 'Games',
        description: 'Jogo da memória educativo',
        files: [
          'src/pages/MemoryGame.tsx',
          'src/memory/cardGenerator.ts',
          'src/memory/types.ts',
          'src/memory/components/',
        ],
        routes: ['/game/memory'],
      },
      {
        module: 'Persistência de Jogos',
        category: 'Games',
        description: 'Salvamento e retomada de sessões de jogo',
        files: [
          'src/hooks/useGamePersistence.ts',
          'src/hooks/useGameSessions.ts',
        ],
        supabaseTables: ['game_sessions'],
        migrationKeywords: ['game_sessions'],
      },
    ],
  },
  {
    category: 'Enterprise',
    title: 'Enterprise — Perfil Empresarial',
    subtitle: 'Diagnóstico privado para empreendimentos turísticos',
    modules: [
      {
        module: 'Perfil & Dados',
        category: 'Enterprise',
        description: 'Cadastro e gestão de perfis empresariais',
        files: [
          'src/hooks/useEnterpriseProfiles.ts',
          'src/components/enterprise/',
        ],
        supabaseTables: ['enterprise_profiles'],
        migrationKeywords: ['enterprise_profiles'],
      },
      {
        module: 'Receita & KPIs',
        category: 'Enterprise',
        description: 'Mix de canais, sazonalidade mensal e KPIs financeiros',
        files: [
          'src/hooks/useEnterpriseRevenue.ts',
          'src/hooks/useEnterpriseDashboardData.ts',
          'src/components/enterprise/EnterpriseRevenuePanel.tsx',
        ],
        supabaseTables: ['enterprise_distribution_channels', 'enterprise_seasonality_months'],
        migrationKeywords: ['enterprise_distribution_channels', 'enterprise_seasonality_months'],
      },
      {
        module: 'Reputação',
        category: 'Enterprise',
        description: 'Histórico de reviews e benchmarking competitivo',
        files: [
          'src/hooks/useEnterpriseReputation.ts',
          'src/components/enterprise/EnterpriseReputationPanel.tsx',
          'supabase/functions/search-competitors/index.ts',
        ],
        supabaseTables: ['enterprise_review_snapshots', 'enterprise_competitors'],
        edgeFunctions: ['search-competitors', 'search-business-reviews'],
        migrationKeywords: ['enterprise_review_snapshots', 'enterprise_competitors'],
        secrets: ['FIRECRAWL_API_KEY'],
      },
      {
        module: 'Compliance',
        category: 'Enterprise',
        description: 'Checklist legal e validação automática de CNPJ',
        files: [
          'src/hooks/useEnterpriseCompliance.ts',
          'src/components/enterprise/EnterpriseCompliancePanel.tsx',
          'supabase/functions/validate-cnpj/index.ts',
        ],
        supabaseTables: ['enterprise_compliance_items', 'cnpj_validation_cache'],
        edgeFunctions: ['validate-cnpj'],
        migrationKeywords: ['enterprise_compliance_items', 'cnpj_validation_cache'],
      },
    ],
  },
  {
    category: 'Comunidade',
    title: 'Comunidade',
    subtitle: 'Fórum e canais de feedback',
    modules: [
      {
        module: 'Fórum',
        category: 'Comunidade',
        description: 'Posts, comentários e moderação',
        files: [
          'src/pages/Forum.tsx',
          'src/hooks/useForum.ts',
          'src/hooks/useForumNotifications.ts',
          'src/components/forum/',
        ],
        supabaseTables: ['forum_posts', 'forum_comments', 'forum_reactions'],
        routes: ['/forum'],
        migrationKeywords: ['forum_posts', 'forum_comments', 'forum_reactions'],
        edgeFunctions: ['moderate-image'],
      },
      {
        module: 'Feedback',
        category: 'Comunidade',
        description: 'Coleta e gestão de feedback de usuários',
        files: [
          'src/hooks/useUserFeedback.ts',
          'src/hooks/useCommunityFeedback.ts',
          'src/components/feedback/',
        ],
        supabaseTables: ['user_feedback', 'community_feedback'],
        migrationKeywords: ['user_feedback', 'community_feedback'],
      },
    ],
  },
  {
    category: 'Plataforma',
    title: 'Plataforma (Cross-cutting)',
    subtitle: 'Auth, perfis, licenciamento e infraestrutura compartilhada',
    modules: [
      {
        module: 'Auth & Onboarding',
        category: 'Plataforma',
        description: 'Autenticação, onboarding e termos de uso',
        files: [
          'src/pages/Auth.tsx',
          'src/pages/Onboarding.tsx',
          'src/pages/TermsAcceptance.tsx',
          'src/hooks/useAuth.tsx',
          'src/hooks/useTermsAcceptance.ts',
        ],
        supabaseTables: ['profiles', 'terms_acceptance'],
        routes: ['/auth', '/onboarding', '/termos', '/pending-approval'],
        edgeFunctions: ['auth-email-hook', 'send-transactional-email', 'process-email-queue', 'handle-email-suppression', 'handle-email-unsubscribe', 'preview-transactional-email'],
        migrationKeywords: ['profiles', 'terms_acceptance', 'complete_user_onboarding'],
      },
      {
        module: 'Perfil & Roles',
        category: 'Plataforma',
        description: 'Gestão de perfil e papéis (ADMIN/ANALYST/VIEWER/ESTUDANTE/PROFESSOR)',
        files: [
          'src/contexts/ProfileContext.tsx',
          'src/hooks/useProfile.ts',
          'src/services/profiles.ts',
        ],
        supabaseTables: ['profiles', 'user_roles', 'organizations'],
        migrationKeywords: ['user_roles', 'app_role', 'has_role', 'organizations', 'get_effective_org_id'],
        edgeFunctions: ['manage-users'],
      },
      {
        module: 'Licenciamento',
        category: 'Plataforma',
        description: 'Trial 7 dias, planos Basic/Pro/Enterprise, feature gating',
        files: [
          'src/contexts/LicenseContext.tsx',
          'src/components/layout/LicenseRoute.tsx',
        ],
        supabaseTables: ['licenses', 'license_features'],
        routes: ['/assinatura', '/admin/licencas'],
        migrationKeywords: ['licenses', 'license_features', 'expire_trial_licenses', 'upgrade_license'],
      },
      {
        module: 'Módulos por Org',
        category: 'Plataforma',
        description: 'Feature flags por organização',
        files: [
          'src/contexts/OrgModulesContext.tsx',
          'src/hooks/useOrgModules.ts',
        ],
        supabaseTables: ['org_modules'],
        migrationKeywords: ['org_modules'],
      },
      {
        module: 'Notificações',
        category: 'Plataforma',
        description: 'Sistema unificado de notificações',
        files: [
          'src/hooks/useNotifications.ts',
          'src/hooks/useTrialNotifications.ts',
        ],
        supabaseTables: ['notifications'],
        migrationKeywords: ['notifications'],
      },
      {
        module: 'Auditoria',
        category: 'Plataforma',
        description: 'Logs de auditoria e monitoramento',
        files: [
          'src/pages/AuditLogs.tsx',
          'src/hooks/useAuditLogger.ts',
          'src/hooks/useLMSAudit.ts',
          'src/hooks/useClientErrorMonitor.ts',
        ],
        supabaseTables: ['audit_logs', 'client_errors'],
        routes: ['/admin/audit', '/admin/report-logs', '/admin/ingestoes'],
        migrationKeywords: ['audit_logs', 'client_errors'],
        edgeFunctions: ['run-health-check', 'sync-test-registry'],
      },
      {
        module: 'Chat Beni',
        category: 'Plataforma',
        description: 'Professor Beni AI (chatbot com TTS)',
        files: [
          'src/pages/BeniChat.tsx',
          'src/components/chat/',
          'supabase/functions/beni-chat/index.ts',
          'supabase/functions/elevenlabs-tts/index.ts',
        ],
        routes: ['/professor-beni'],
        edgeFunctions: ['beni-chat', 'elevenlabs-tts'],
        secrets: ['LOVABLE_API_KEY', 'ELEVENLABS_API_KEY'],
      },
      {
        module: 'Base de Conhecimento',
        category: 'Plataforma',
        description: 'Knowledge base para consultas e referências',
        files: [
          'src/pages/KnowledgeBase.tsx',
          'src/hooks/useKnowledgeBase.ts',
        ],
        supabaseTables: ['knowledge_base_documents'],
        routes: ['/base-conhecimento'],
        migrationKeywords: ['knowledge_base_documents'],
        edgeFunctions: ['moderate-kb-upload'],
      },
    ],
  },
];

export function buildModuleManifestJson(m: ModuleManifest): string {
  return JSON.stringify(
    {
      module: m.module,
      category: m.category,
      description: m.description,
      files: m.files,
      dependencies: m.dependencies ?? {},
      supabaseTables: m.supabaseTables ?? [],
      edgeFunctions: m.edgeFunctions ?? [],
      routes: m.routes ?? [],
      migrationKeywords: m.migrationKeywords ?? [],
      secrets: m.secrets ?? [],
    },
    null,
    2,
  );
}

/**
 * Gera um prompt em linguagem natural pronto para colar em outro projeto
 * Lovable. O prompt instrui o agente a portar o módulo, listando exatamente
 * o que precisa ser copiado, migrado, configurado e quais segredos pedir.
 */
export function buildModuleMigrationPrompt(m: ModuleManifest): string {
  const lines: string[] = [];
  lines.push(
    `Porte o módulo "${m.module}" (categoria: ${m.category}) do projeto SISTUR para este projeto.`,
  );
  lines.push('');
  lines.push(`Descrição: ${m.description}`);
  lines.push('');

  lines.push('1) Copie os arquivos abaixo do projeto de origem, preservando o caminho:');
  m.files.forEach((f) => lines.push(`   - ${f}`));

  if (m.routes?.length) {
    lines.push('');
    lines.push('2) Registre as rotas em src/App.tsx (lazy-load + ProtectedRoute quando aplicável):');
    m.routes.forEach((r) => lines.push(`   - ${r}`));
  }

  if (m.supabaseTables?.length || m.migrationKeywords?.length) {
    lines.push('');
    lines.push('3) Banco de dados (Lovable Cloud / Supabase) — crie as tabelas abaixo via migration única, com RLS habilitado, policies por org_id/user_id e GRANTs apropriados (authenticated + service_role):');
    (m.supabaseTables ?? []).forEach((t) => lines.push(`   - public.${t}`));
    if (m.migrationKeywords?.length) {
      lines.push(`   Procure no projeto de origem migrations que contenham: ${m.migrationKeywords.join(', ')}`);
    }
  }

  if (m.edgeFunctions?.length) {
    lines.push('');
    lines.push('4) Edge functions — copie e implante:');
    m.edgeFunctions.forEach((fn) => lines.push(`   - supabase/functions/${fn}/index.ts`));
  }

  if (m.secrets?.length) {
    lines.push('');
    lines.push('5) Secrets necessários (peça ao usuário se ainda não existirem):');
    m.secrets.forEach((s) => lines.push(`   - ${s}`));
  }

  const dep = m.dependencies;
  if (dep && (dep.hooks?.length || dep.contexts?.length || dep.ui?.length)) {
    lines.push('');
    lines.push('6) Dependências internas obrigatórias:');
    if (dep.contexts?.length) lines.push(`   - Contexts: ${dep.contexts.join(', ')}`);
    if (dep.hooks?.length) lines.push(`   - Hooks: ${dep.hooks.join(', ')}`);
    if (dep.ui?.length) lines.push(`   - UI/Libs: ${dep.ui.join(', ')}`);
  }

  lines.push('');
  lines.push('Validação final: rode build/typecheck, abra cada rota nova e confirme que as queries retornam dados (RLS pode bloquear silenciosamente se faltar GRANT).');

  lines.push('');
  lines.push('--- MANIFESTO JSON DE REFERÊNCIA ---');
  lines.push(buildModuleManifestJson(m));

  return lines.join('\n');
}