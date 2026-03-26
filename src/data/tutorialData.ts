import {
  LayoutDashboard, ClipboardList, FolderKanban, Activity,
  GraduationCap, BookOpen, Bot, MessageSquare, Gamepad2,
  Settings, Shield, Users, BarChart3, FileText,
  CreditCard, Tag, School, UserPlus, BookMarked,
} from 'lucide-react';

export type TutorialRole = 'ERP' | 'ESTUDANTE' | 'PROFESSOR' | 'ADMIN';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  route?: string;
  roles: TutorialRole[];
  category: string;
}

export interface TutorialCategory {
  id: string;
  title: string;
  description: string;
  roles: TutorialRole[];
  steps: TutorialStep[];
}

export const tutorialCategories: TutorialCategory[] = [
  {
    id: 'getting-started',
    title: 'Primeiros Passos',
    description: 'Configure sua conta e conheça a plataforma',
    roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
    steps: [
      {
        id: 'gs-profile',
        title: 'Seu Perfil',
        description: 'Após o cadastro, você passa pelo onboarding onde escolhe seu tipo de acesso (ERP ou EDU) e seu papel. Seu perfil é aprovado pela equipe administrativa antes de ter acesso completo.',
        icon: Users,
        roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
        category: 'getting-started',
      },
      {
        id: 'gs-terms',
        title: 'Termos de Uso',
        description: 'Na primeira vez que acessar, será necessário aceitar os Termos e Condições do SISTUR. Isso garante que você está ciente das regras de uso da plataforma.',
        icon: FileText,
        roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
        category: 'getting-started',
      },
      {
        id: 'gs-trial',
        title: 'Período de Teste',
        description: 'Novos usuários recebem 7 dias de trial gratuito com acesso a ERP, EDU e Jogos. Após o período, escolha um plano na página de Planos para continuar.',
        icon: CreditCard,
        route: '/assinatura',
        roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
        category: 'getting-started',
      },
      {
        id: 'gs-beni',
        title: 'Professor Beni (IA)',
        description: 'O Professor Beni é seu assistente inteligente. Faça perguntas sobre turismo, metodologia SISTUR, ou peça ajuda para interpretar diagnósticos. Acessível pelo menu lateral.',
        icon: Bot,
        route: '/professor-beni',
        roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
        category: 'getting-started',
      },
    ],
  },
  {
    id: 'erp-diagnostics',
    title: 'Diagnósticos Territoriais',
    description: 'Avalie destinos turísticos usando a metodologia de Mario Beni',
    roles: ['ERP', 'ADMIN'],
    steps: [
      {
        id: 'erp-dashboard',
        title: 'Dashboard Principal',
        description: 'O Dashboard apresenta uma visão geral dos diagnósticos: scores dos 3 pilares (RA, OE, AO), alertas IGMA, tendências e planos de ação. Use o toggle Territorial/Enterprise para alternar entre visões.',
        icon: LayoutDashboard,
        route: '/',
        roles: ['ERP', 'ADMIN'],
        category: 'erp-diagnostics',
      },
      {
        id: 'erp-diagnosticos',
        title: 'Criar Diagnósticos',
        description: 'Em Diagnósticos, crie novas rodadas de avaliação para seus destinos. Selecione indicadores, insira valores e o sistema calcula automaticamente scores normalizados, issues e prescrições via motor IGMA.',
        icon: ClipboardList,
        route: '/diagnosticos',
        roles: ['ERP', 'ADMIN'],
        category: 'erp-diagnostics',
      },
      {
        id: 'erp-projetos',
        title: 'Gestão de Projetos',
        description: 'Crie projetos vinculados a planos de ação. Organize em fases, milestones e tarefas. Acompanhe o progresso e associe a diagnósticos específicos.',
        icon: FolderKanban,
        route: '/projetos',
        roles: ['ERP', 'ADMIN'],
        category: 'erp-diagnostics',
      },
      {
        id: 'erp-monitoring',
        title: 'Monitoramento ERP',
        description: 'O painel de Monitoramento ERP acompanha evolução dos ciclos, progresso por pilar, projetos atrasados e planos recentes. Ideal para gestores acompanharem KPIs em tempo real.',
        icon: Activity,
        route: '/erp',
        roles: ['ERP', 'ADMIN'],
        category: 'erp-diagnostics',
      },
      {
        id: 'erp-reports',
        title: 'Relatórios',
        description: 'Gere relatórios detalhados dos diagnósticos com gráficos, comparativos e exportação. Disponível nos planos Pro e Enterprise.',
        icon: BarChart3,
        route: '/relatorios',
        roles: ['ERP', 'ADMIN'],
        category: 'erp-diagnostics',
      },
    ],
  },
  {
    id: 'edu-student',
    title: 'Educação — Estudante',
    description: 'Aprenda sobre turismo sustentável através de trilhas e capacitações',
    roles: ['ESTUDANTE', 'ADMIN'],
    steps: [
      {
        id: 'edu-catalog',
        title: 'Catálogo de Cursos',
        description: 'O SISTUR EDU oferece um catálogo de trilhas e capacitações organizadas por pilar (RA, OE, AO). Explore o conteúdo disponível e matricule-se nas trilhas de seu interesse.',
        icon: GraduationCap,
        route: '/edu',
        roles: ['ESTUDANTE', 'ADMIN'],
        category: 'edu-student',
      },
      {
        id: 'edu-profile',
        title: 'Perfil de Estudante',
        description: 'Preencha seu perfil educacional com áreas de interesse, nível de experiência e disponibilidade semanal. Isso permite recomendações personalizadas de conteúdo.',
        icon: Users,
        route: '/edu/perfil',
        roles: ['ESTUDANTE', 'ADMIN'],
        category: 'edu-student',
      },
      {
        id: 'edu-referral',
        title: 'Código do Professor',
        description: 'Se você foi convidado por um professor, insira o código de referral durante o cadastro. Isso vincula você ao professor e permite que ele acompanhe seu progresso e atribua conteúdo.',
        icon: Tag,
        roles: ['ESTUDANTE'],
        category: 'edu-student',
      },
      {
        id: 'edu-certificates',
        title: 'Certificados',
        description: 'Ao completar trilhas e provas, você recebe certificados digitais verificáveis com QR Code. Acesse-os na página de Certificados.',
        icon: FileText,
        route: '/certificados',
        roles: ['ESTUDANTE', 'ADMIN'],
        category: 'edu-student',
      },
      {
        id: 'edu-games',
        title: 'Jogos Educacionais',
        description: 'Aprenda jogando! O SISTUR oferece 4 jogos educacionais: TCG (cartas), RPG (narrativa), Memória e Caça ao Tesouro. Todos ensinam conceitos de turismo sustentável de forma divertida.',
        icon: Gamepad2,
        route: '/game',
        roles: ['ESTUDANTE', 'ADMIN'],
        category: 'edu-student',
      },
    ],
  },
  {
    id: 'edu-professor',
    title: 'Painel do Professor',
    description: 'Gerencie alunos, salas e conteúdo educacional',
    roles: ['PROFESSOR', 'ADMIN'],
    steps: [
      {
        id: 'prof-referral',
        title: 'Sistema de Referral',
        description: 'Gere seu código e link de convite únicos. Compartilhe com alunos para que eles se vinculem a você no cadastro. Com 5+ alunos ativos, sua mensalidade é isenta automaticamente!',
        icon: UserPlus,
        route: '/professor',
        roles: ['PROFESSOR', 'ADMIN'],
        category: 'edu-professor',
      },
      {
        id: 'prof-classrooms',
        title: 'Gestão de Salas',
        description: 'Crie turmas com nome, disciplina e período. Matricule seus alunos referenciados nas salas para organizar o conteúdo por grupo.',
        icon: School,
        route: '/professor',
        roles: ['PROFESSOR', 'ADMIN'],
        category: 'edu-professor',
      },
      {
        id: 'prof-assignments',
        title: 'Atribuição de Conteúdo',
        description: 'Atribua trilhas, capacitações, provas ou conteúdo próprio às salas. Defina datas de disponibilidade e prazos de entrega para cada atividade.',
        icon: BookOpen,
        route: '/professor',
        roles: ['PROFESSOR', 'ADMIN'],
        category: 'edu-professor',
      },
      {
        id: 'prof-monitoring',
        title: 'Acompanhamento',
        description: 'Veja o progresso de cada aluno por sala. Acompanhe quem completou atividades, notas em provas e engajamento com as trilhas atribuídas.',
        icon: BarChart3,
        route: '/professor',
        roles: ['PROFESSOR', 'ADMIN'],
        category: 'edu-professor',
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administração',
    description: 'Gerencie usuários, organizações, licenças e configurações',
    roles: ['ADMIN'],
    steps: [
      {
        id: 'admin-users',
        title: 'Gestão de Usuários',
        description: 'Aprove novos usuários, altere papéis (Admin, Analista, Viewer, Estudante, Professor), gerencie organizações e exporte dados de usuários.',
        icon: Users,
        route: '/configuracoes',
        roles: ['ADMIN'],
        category: 'admin',
      },
      {
        id: 'admin-licenses',
        title: 'Gestão de Licenças',
        description: 'Visualize todas as licenças ativas, trials, conversões. Cancele ou estenda licenças. Gerencie cotas por organização e monitore métricas de conversão.',
        icon: Shield,
        route: '/admin/licencas',
        roles: ['ADMIN'],
        category: 'admin',
      },
      {
        id: 'admin-edu',
        title: 'Gestão EDU',
        description: 'Administre o catálogo de treinamentos, gerencie questões do banco de provas, configure regras de exames e revise conteúdo importado.',
        icon: BookMarked,
        route: '/admin/edu',
        roles: ['ADMIN'],
        category: 'admin',
      },
      {
        id: 'admin-settings',
        title: 'Configurações do Sistema',
        description: 'Acesse configurações avançadas: modo demo, privacidade do fórum, aprovações pendentes, feedback dos usuários e logs de auditoria.',
        icon: Settings,
        route: '/configuracoes',
        roles: ['ADMIN'],
        category: 'admin',
      },
    ],
  },
  {
    id: 'community',
    title: 'Comunidade',
    description: 'Interaja com outros profissionais do turismo',
    roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
    steps: [
      {
        id: 'comm-forum',
        title: 'Social Turismo',
        description: 'O fórum da comunidade permite trocar experiências, tirar dúvidas e compartilhar boas práticas com outros profissionais do turismo. Publique posts, comente e curta conteúdos.',
        icon: MessageSquare,
        route: '/forum',
        roles: ['ERP', 'ESTUDANTE', 'PROFESSOR', 'ADMIN'],
        category: 'community',
      },
    ],
  },
];

export function getTutorialForRole(role: TutorialRole): TutorialCategory[] {
  return tutorialCategories
    .filter(cat => cat.roles.includes(role))
    .map(cat => ({
      ...cat,
      steps: cat.steps.filter(step => step.roles.includes(role)),
    }))
    .filter(cat => cat.steps.length > 0);
}

export function getUserTutorialRole(
  isAdmin: boolean,
  isProfessor: boolean,
  isEstudante: boolean,
  hasERPAccess: boolean
): TutorialRole {
  if (isAdmin) return 'ADMIN';
  if (isProfessor) return 'PROFESSOR';
  if (isEstudante) return 'ESTUDANTE';
  return 'ERP';
}
