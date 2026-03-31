/**
 * Controle de Versão do SISTUR
 * 
 * Formato: MAJOR.MINOR.PATCH
 * - MAJOR: Mudanças incompatíveis ou grandes reformulações (1.0.0)
 * - MINOR: Novas funcionalidades compatíveis (.1, .2, .3)
 * - PATCH: Correções de bugs e micro ajustes (.0.1, .0.2)
 * 
 * Changelog deve ser atualizado a cada versão
 */

export const APP_VERSION = {
  major: 1,
  minor: 11,
  patch: 2,
  get full() {
    return `${this.major}.${this.minor}.${this.patch}`;
  },
  get short() {
    return `v${this.major}.${this.minor}`;
  }
};

export const VERSION_HISTORY = [
  {
    version: "1.11.2",
    date: "2026-03-31",
    type: "patch" as const,
    changes: [
      "Correção: indicadores ignorados agora excluídos de gargalos, recomendações e normalização",
      "Fix: dados externos não reintroduzem indicadores marcados como ignorados no cálculo",
      "Banner de indicadores ignorados com listagem e aviso de impacto na análise",
      "Moderação de conteúdo no fórum com termômetro de restrição (admin)",
      "Suporte a até 6 imagens por post com carrossel e moderação automática via IA",
      "Guardrails no Professor Beni: respostas limitadas a temas de turismo",
      "Admin pode fixar, editar e excluir qualquer post/resposta no fórum"
    ]
  },
  {
    type: "patch" as const,
    changes: [
      "Tutorial integrado à Central de Ajuda como aba 'Tutoriais'",
      "Central de Ajuda reorganizada em 3 abas: Tutoriais, Guia Rápido e Funcionalidades",
      "Novas funcionalidades adicionadas ao mapa de ajuda: Projetos, Monitoramento ERP, Jogos, Professor Beni, Social Turismo",
      "Menu lateral atualizado: 'Ajuda & Tutorial' substitui itens separados",
      "Rota /tutorial redireciona automaticamente para /ajuda"
    ]
  },
  {
    version: "1.11.0",
    date: "2026-03-27",
    type: "minor" as const,
    changes: [
      "Tutorial detalhado com navegação passo-a-passo por tópico",
      "Cada tópico agora tem sub-passos numerados com instruções detalhadas e dicas",
      "Imagens ilustrativas geradas para passos-chave do tutorial",
      "Barra de progresso por tópico com marcação individual de conclusão",
      "Sidebar de navegação lateral nos tutoriais detalhados (desktop)",
      "Rota /tutorial/:topicId para acesso direto a qualquer tópico",
      "Cards do tutorial principal agora mostram tempo estimado e contagem de passos",
      "Seção de dicas expansível em cada passo do tutorial"
    ]
  },
  {
    version: "1.10.0",
    date: "2026-03-26",
    type: "minor" as const,
    changes: [
      "Sistema de Tutorial com conteúdo personalizado por perfil (Admin, Professor, Estudante, ERP)",
      "Wizard de primeiro acesso: aparece automaticamente após onboarding",
      "Página /tutorial permanente com categorias, progresso e marcação de etapas concluídas",
      "Admin pode visualizar tutoriais de todos os perfis via abas",
      "Item 'Tutorial' adicionado ao menu lateral (acessível para todos)",
      "Progresso do tutorial salvo localmente com indicador de percentual"
    ]
  },
  {
    version: "1.9.0",
    date: "2026-03-26",
    type: "minor" as const,
    changes: [
      "Sistema de referência professor → aluno com código único e link de convite",
      "Isenção automática de mensalidade para professor com 5+ alunos ativos",
      "Campo opcional de código de professor no onboarding de estudantes",
      "Painel do Professor com gestão de salas/turmas (CRUD completo)",
      "Turmas com nome, disciplina, período de início/fim",
      "Matrícula de alunos em salas e gestão individual",
      "Atribuição de atividades (trilhas, testes, conteúdo próprio) com prazos",
      "Nova rota /professor no sidebar para professores EDU",
      "Tabelas: professor_referral_codes, student_referrals, classrooms, classroom_students, classroom_assignments",
      "RLS policies completas com funções de segurança (owns_classroom, professor_qualifies_free_license)"
    ]
  },
  {
    version: "1.8.5",
    date: "2026-03-26",
    type: "patch" as const,
    changes: [
      "Fluxo de cancelamento de plano com motivo obrigatório e confirmação",
      "Usuários cancelam seu próprio plano mantendo acesso até o fim do período",
      "Admins podem cancelar licença de qualquer usuário via painel de gestão",
      "Estado 'Cancelado' exibido na página de Planos com mensagem informativa",
      "Licenças canceladas com data futura mantêm acesso até expiração",
      "Exclusão de usuários SISTUR das métricas de licenças externas",
      "Consistência de organizações na aba Cotas por Organização",
      "Correção RLS para ativação de trial por usuários não-admin"
    ]
  },
  {
    version: "1.8.4",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Auto-expiração de trials via cron job diário (3h UTC)",
      "Notificações in-app de expiração do trial (3 dias, 1 dia, expirado)",
      "Bloqueio visual de funcionalidades restritas no menu (ícone de cadeado)",
      "Relatórios bloqueados para plano trial com redirecionamento para Planos",
      "Novo painel admin 'Controle de Trials' com métricas e funil de conversão",
      "Lista de trials recentes com status visual (saudável, atenção, crítico, expirado)"
    ]
  },
  {
    version: "1.8.3",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Menu mobile agora exibe a opção Planos para usuários como Renata",
      "Correção do preload para Safari/iPhone sem requestIdleCallback",
      "Fluxo Autônomo restaurado ao remover licença indevida da Renata",
      "Renata volta a ser redirecionada para Planos com opção de ativar trial"
    ]
  },
  {
    version: "1.8.2",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "Metodologia oculta do menu para usuários não-admin",
      "Renomeado 'Assinatura' para 'Planos' no menu e comunicações",
      "Página de Planos com explicação detalhada do trial para novos usuários",
      "Admin pode estender duração do trial na gestão de licenças",
      "Correção do fluxo Autônomo: termos → planos → ativação trial"
    ]
  },
  {
    version: "1.8.1",
    date: "2026-03-25",
    type: "patch" as const,
    changes: [
      "E-mail automático de notificação quando o acesso do usuário é aprovado",
      "Infraestrutura de e-mail transacional com fila durável e retries",
      "Página de cancelamento de inscrição (/unsubscribe)",
      "Template de e-mail com identidade visual do Instituto Mario Beni"
    ]
  },
  {
    version: "1.8.0",
    date: "2026-03-25",
    type: "minor" as const,
    changes: [
      "Sistema de Licenciamento completo (trial, estudante, professor, basic, pro, enterprise)",
      "Termos e condições obrigatórios na primeira utilização",
      "Exportação CSV de usuários com status, licença, termos e acessos",
      "Auditoria e correção de dados: licenças criadas para 15 usuários pendentes",
      "Otimização de performance: QueryClient com staleTime/gcTime, useMemo em contexts",
      "Planos de assinatura EDU (Estudante R$19, Professor R$39) na página de assinatura",
      "Coluna de aceite de termos no gerenciamento de usuários"
    ]
  },
  {
    version: "1.7.16",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Fix: Recomendações agora buscam treinamentos de edu_trainings via training_id",
      "RecommendationCard exibe título, descrição e duração do modelo unificado",
      "Tipos Recommendation e Prescription atualizados com training_id e training",
      "Fallback para legacy courses mantido para compatibilidade"
    ]
  },
  {
    version: "1.7.15",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Fix: Issues Enterprise agora mostram nome da categoria (não UUID)",
      "Coluna training_id (TEXT) adicionada em prescriptions e recommendations",
      "Edge function calculate-assessment usa enterpriseCategoryMap para nomes legíveis"
    ]
  },
  {
    version: "1.7.14",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Correção de 37 mapeamentos EDU órfãos - códigos de indicadores sincronizados",
      "Total de mapeamentos EDU válidos: 94 (anteriormente 60)",
      "6 indicadores agora com escopo 'ambos': NPS, Reviews, Treinamento, Emprego Local, Compras Locais, Certificações",
      "Edge function calculate-assessment corrige nomes de categoria Enterprise nas issues",
      "Documentação atualizada com catálogo unificado e indicadores compartilhados"
    ]
  },
  {
    version: "1.7.13",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Filtro de Escopo (Territorial/Enterprise/Ambos) no painel de Indicadores",
      "Relatório de distribuição de indicadores por Escopo × Pilar × Tier",
      "Gráficos de barras e pizza para visualização da distribuição",
      "Matriz detalhada com contagem de indicadores por combinação",
      "Botão 'Novo Indicador' funcional com formulário completo de cadastro"
    ]
  },
  {
    version: "1.7.12",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Debug logging para investigar toggle Enterprise no Dashboard",
      "Verificação de has_enterprise_access nas organizações SISTUR e Demo"
    ]
  },
  {
    version: "1.7.11",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Dashboard principal com toggle Territorial/Enterprise unificado",
      "KPIs Enterprise no Dashboard: RevPAR, NPS, Taxa Ocupação, Certificações ESG",
      "Novo hook useEnterpriseDashboardData para métricas hoteleiras",
      "Componente EnterpriseKPICards com 8 métricas visuais",
      "Filtro de destinos adaptativo por tipo de diagnóstico"
    ]
  },
  {
    version: "1.7.10",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Adicionado filtro de escopo (Territorial/Enterprise/Ambos) na página de Indicadores",
      "Dashboard ERP atualizado com toggle Territorial/Enterprise para segregar dados",
      "Hooks usePillarProgress e useCycleEvolution agora filtram por diagnostic_type",
      "Badges de escopo visíveis e editáveis inline na tabela de indicadores"
    ]
  },
  {
    version: "1.7.7",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Criada tabela enterprise_indicator_scores para armazenar scores normalizados",
      "Edge function calculate-assessment insere scores na tabela correta por tipo",
      "Hooks useIndicatorScores e useEnterpriseIndicatorValuesForAssessment unificados",
      "DiagnosticoDetalhe detecta diagnostic_type e busca dados da fonte correta",
      "NormalizationView e IndicatorScoresView agora funcionam para diagnósticos Enterprise"
    ]
  },
  {
    version: "1.7.6",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Indicadores agora mostram escopo: Territorial, Enterprise ou Ambos",
      "Nova coluna 'Escopo' na tabela de indicadores com badges coloridos",
      "Organizações com dois toggles independentes: Territorial e Enterprise",
      "Ambos os acessos podem ser habilitados simultaneamente",
      "UI da tabela de organizações mostra badges de acessos habilitados"
    ]
  },
  {
    version: "1.7.5",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Demo Mode agora tem acesso Enterprise habilitado",
      "Diagnóstico demo Enterprise criado (Hotel Gramado 2026) com 25 indicadores",
      "Mapeamento de 23 indicadores Enterprise para treinamentos EDU",
      "Edge function calculate-assessment suporta diagnostic_type = 'enterprise'",
      "Cálculo IGMA unificado para diagnósticos territoriais e enterprise"
    ]
  },
  {
    version: "1.7.4",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "Documentação atualizada com módulo Enterprise",
      "FAQ inclui perguntas sobre Enterprise, org_type e indicadores hoteleiros",
      "Ajuda inclui guia rápido e seções Enterprise para admins",
      "Metodologia documenta categorias Enterprise e mapeamento aos 3 pilares"
    ]
  },
  {
    version: "1.7.1",
    date: "2026-01-23",
    type: "patch" as const,
    changes: [
      "UI de Organizações com seletor de tipo (Pública/Privada)",
      "Toggle de Acesso Enterprise por organização",
      "Tabela de organizações exibe tipo e badge Enterprise",
      "Ícones diferenciados: Landmark (pública) vs Hotel (privada)"
    ]
  },
  {
    version: "1.7.0",
    date: "2026-01-23",
    type: "minor" as const,
    changes: [
      "Novo módulo SISTUR Enterprise para setor privado (hotéis, resorts, pousadas)",
      "Classificação de organizações: PUBLIC (governo/município) vs PRIVATE (empresas)",
      "26 indicadores enterprise baseados na metodologia Mario Beni",
      "15 categorias de indicadores: sustentabilidade, governança, operações",
      "Benchmarks e metas por indicador (ex: RevPAR, NPS, Taxa de Ocupação)",
      "Tiers adaptados para contexto enterprise (Essencial, Estratégico, Integral)"
    ]
  },
  {
    version: "1.6.0",
    date: "2026-01-23",
    type: "minor" as const,
    changes: [
      "Unificação do motor de recomendações EDU com modelo canônico",
      "Prescrições agora usam edu_trainings via edu_indicator_training_map",
      "Justificativas dinâmicas com reason_template por indicador",
      "Nomenclatura corrigida: I-RA, I-OE, I-AO na página de autenticação",
      "Fallback para courses legado mantido para compatibilidade"
    ]
  },
  {
    version: "1.5.5",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Indicadores movido para dentro de Diagnósticos como aba",
      "Menu lateral simplificado - Indicadores removido",
      "Novo componente IndicadoresPanel reutilizável"
    ]
  },
  {
    version: "1.5.4",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Correção do YouTube player para preencher 100% do frame",
      "Iframe e container interno forçados a ocupar largura/altura completas"
    ]
  },
  {
    version: "1.5.3",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Novo YouTubePlayer com API IFrame para controle total",
      "Controles customizados abaixo do vídeo (play, seek, volume)",
      "Overlay completo bloqueia clique-direito e interações com YouTube",
      "Clique no vídeo para play/pause funciona normalmente"
    ]
  },
  {
    version: "1.5.2",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "Iframe do YouTube reposicionado com crop para esconder UI nativa",
      "Overlays sólidos no topo e rodapé cobrem título, logo, Share e Watch on YouTube",
      "Bordas pretas nas laterais para esconder elementos cortados",
      "Bloqueio de clique nas áreas de overlay"
    ]
  },
  {
    version: "1.5.1",
    date: "2026-01-16",
    type: "patch" as const,
    changes: [
      "YouTube embed usa domínio privado (youtube-nocookie.com)",
      "Overlay esconde botões 'Watch on YouTube' e 'Share'",
      "Parâmetros modestbranding e rel=0 para reduzir branding",
      "Bloqueio de clique-direito no iframe do YouTube/Vimeo",
      "Vimeo embed com title/byline/badge ocultos"
    ]
  },
  {
    version: "1.5.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Proteção de vídeos com URLs assinadas temporárias (5 min de expiração)",
      "Novo hook useSecureVideoUrl para acesso seguro ao storage",
      "Auto-refresh de URLs antes da expiração",
      "Bloqueio de clique-direito no player de vídeo",
      "Mensagens de erro e loading states aprimorados no VideoPlayer"
    ]
  },
  {
    version: "1.4.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Otimização de navegação do sidebar - elimina 'piscar' ao trocar de página",
      "Novo ProfileContext centralizado para cache de perfil",
      "Melhoria de performance com useMemo nos componentes de navegação",
      "Transições mais suaves entre rotas protegidas"
    ]
  },
  {
    version: "1.3.0",
    date: "2026-01-16",
    type: "minor" as const,
    changes: [
      "Tradução completa da interface para português",
      "Metodologia 'Waterfall' renomeada para 'Cascata'",
      "Descrições de projetos traduzidas para português",
      "Melhorias gerais de localização e terminologia"
    ]
  },
  {
    version: "1.1.0",
    date: "2025-01-16",
    type: "minor" as const,
    changes: [
      "Adicionado escopo de visibilidade em Nova Rodada (Organização ou Pessoal)",
      "Destinos e diagnósticos podem ser compartilhados com a organização ou mantidos privados",
      "RLS policies atualizadas para respeitar visibilidade"
    ]
  },
  {
    version: "1.0.0",
    date: "2025-01-15",
    type: "major" as const,
    changes: [
      "Lançamento inicial do SISTUR",
      "Módulo de Diagnósticos com cálculo IGMA",
      "Módulo EDU com trilhas e treinamentos",
      "Sistema de certificação de destinos",
      "Integração ERP para gestores públicos",
      "Perfil de estudante com recomendações personalizadas"
    ]
  }
];

export type VersionChangeType = "major" | "minor" | "patch";

export interface VersionEntry {
  version: string;
  date: string;
  type: VersionChangeType;
  changes: string[];
}
