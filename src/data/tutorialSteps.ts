/**
 * Detailed step-by-step tutorial data for each tutorial topic.
 * Each topic from tutorialData.ts can have detailed sub-steps here.
 */

export interface TutorialSubStep {
  id: string;
  title: string;
  description: string;
  details: string[];
  tips?: string[];
  imagePath?: string;
  videoUrl?: string;
}

export interface TutorialTopicDetail {
  topicId: string; // matches TutorialStep.id from tutorialData.ts
  title: string;
  introduction: string;
  estimatedMinutes: number;
  subSteps: TutorialSubStep[];
}

export const tutorialTopicDetails: TutorialTopicDetail[] = [
  // ─── PRIMEIROS PASSOS ───
  {
    topicId: 'gs-profile',
    title: 'Seu Perfil',
    introduction: 'Após criar sua conta, o primeiro passo é configurar seu perfil. O SISTUR usa seu perfil para personalizar a experiência e definir quais módulos você pode acessar.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'gs-profile-1',
        title: 'Criar sua conta',
        description: 'Acesse a página de login e clique em "Criar conta". Preencha seu email e uma senha segura.',
        details: [
          'Use um email válido — você receberá um link de confirmação.',
          'A senha deve ter pelo menos 6 caracteres.',
          'Após criar a conta, verifique seu email para ativar o acesso.',
        ],
        tips: ['Use seu email institucional para aprovação mais rápida.'],
        imagePath: '/tutorial/gs-profile-1.jpg',
      },
      {
        id: 'gs-profile-2',
        title: 'Completar o Onboarding',
        description: 'Na primeira vez que entrar, o sistema mostra o assistente de onboarding onde você escolhe seu tipo de acesso.',
        details: [
          'Selecione entre ERP (gestão de destinos) ou EDU (educação e capacitação).',
          'Escolha seu papel: Analista, Estudante, Professor, etc.',
          'Informe o nome da sua organização ou crie uma nova.',
          'Esses dados podem ser alterados depois nas Configurações.',
        ],
        tips: ['Se não sabe qual escolher, converse com seu gestor ou comece com EDU para explorar.'],
        imagePath: '/tutorial/gs-profile-2.jpg',
      },
      {
        id: 'gs-profile-3',
        title: 'Aguardar aprovação',
        description: 'Após completar o onboarding, um administrador precisa aprovar seu acesso.',
        details: [
          'Você verá uma tela de "Aprovação Pendente" enquanto aguarda.',
          'O administrador da sua organização receberá uma notificação.',
          'Normalmente a aprovação leva até 24 horas úteis.',
          'Após aprovado, você terá acesso completo ao sistema.',
        ],
        imagePath: '/tutorial/gs-profile-3.jpg',
      },
    ],
  },
  {
    topicId: 'gs-terms',
    title: 'Termos de Uso',
    introduction: 'O SISTUR requer a aceitação dos Termos e Condições para garantir o uso adequado da plataforma e proteção de dados.',
    estimatedMinutes: 2,
    subSteps: [
      {
        id: 'gs-terms-1',
        title: 'Visualizar os termos',
        description: 'Na primeira vez que acessar após aprovação, os Termos de Uso serão exibidos automaticamente.',
        details: [
          'Leia atentamente os termos de uso e política de privacidade.',
          'Os termos cobrem: uso de dados, responsabilidades, propriedade intelectual.',
          'Role até o final para habilitar o botão de aceitar.',
        ],
      },
      {
        id: 'gs-terms-2',
        title: 'Aceitar e prosseguir',
        description: 'Clique em "Aceitar Termos" para liberar o acesso à plataforma.',
        details: [
          'A aceitação é registrada com data e hora no sistema.',
          'Você pode revisar os termos a qualquer momento nas Configurações.',
          'Caso os termos sejam atualizados, será necessário aceitar novamente.',
        ],
      },
    ],
  },
  {
    topicId: 'gs-trial',
    title: 'Período de Teste',
    introduction: 'Todo novo usuário recebe 7 dias gratuitos com acesso completo ao ERP, EDU e Jogos. Aproveite para explorar todas as funcionalidades!',
    estimatedMinutes: 3,
    subSteps: [
      {
        id: 'gs-trial-1',
        title: 'O que está incluído no trial',
        description: 'Durante os 7 dias, você tem acesso a todos os módulos sem restrições.',
        details: [
          'ERP: Crie destinos, faça diagnósticos e gere relatórios.',
          'EDU: Acesse trilhas, capacitações e certificados.',
          'Jogos: Jogue todos os 4 jogos educacionais.',
          'Fórum: Participe da comunidade.',
        ],
        imagePath: '/tutorial/gs-trial-1.jpg',
      },
      {
        id: 'gs-trial-2',
        title: 'Acompanhar dias restantes',
        description: 'Um banner no topo da tela mostra quantos dias restam do seu período de teste.',
        details: [
          'O contador é atualizado diariamente.',
          'Você receberá um alerta quando restarem 2 dias.',
          'O banner desaparece quando você assina um plano.',
        ],
      },
      {
        id: 'gs-trial-3',
        title: 'Escolher um plano',
        description: 'Antes do trial expirar, acesse a página de Planos para continuar usando o SISTUR.',
        details: [
          'Plano Básico: Acesso ao EDU e Fórum.',
          'Plano Pro: EDU + ERP básico + Relatórios.',
          'Plano Enterprise: Acesso completo + suporte prioritário.',
          'Professores com 5+ alunos referenciados são isentos automaticamente!',
        ],
        tips: ['Explore bem durante o trial para saber qual plano atende suas necessidades.'],
        imagePath: '/tutorial/gs-trial-3.jpg',
      },
    ],
  },
  {
    topicId: 'gs-beni',
    title: 'Professor Beni (IA)',
    introduction: 'O Professor Beni é um assistente com inteligência artificial treinado na metodologia de Mario Beni. Ele pode responder perguntas, interpretar dados e sugerir ações.',
    estimatedMinutes: 3,
    subSteps: [
      {
        id: 'gs-beni-1',
        title: 'Acessar o Professor Beni',
        description: 'No menu lateral, clique em "Prof. Beni" para abrir o chat.',
        details: [
          'O chat abre em tela cheia com interface de conversa.',
          'Suas conversas são salvas e você pode retomá-las depois.',
          'O Beni tem contexto sobre a metodologia SISTUR e seus dados.',
        ],
        imagePath: '/tutorial/gs-beni-1.jpg',
      },
      {
        id: 'gs-beni-2',
        title: 'O que perguntar',
        description: 'O Professor Beni pode ajudar em diversas situações.',
        details: [
          '"O que significa um score baixo em OE?" — Interpretação de indicadores.',
          '"Sugira ações para melhorar o pilar RA" — Recomendações práticas.',
          '"Explique a relação entre os 3 pilares" — Conceitos da metodologia.',
          '"Como criar um diagnóstico?" — Orientação sobre a plataforma.',
        ],
        tips: [
          'Seja específico nas perguntas para respostas mais úteis.',
          'Mencione o nome do destino para contexto adicional.',
        ],
      },
    ],
  },

  // ─── ERP DIAGNÓSTICOS ───
  {
    topicId: 'erp-dashboard',
    title: 'Dashboard Principal',
    introduction: 'O Dashboard é o centro de comando do SISTUR ERP. Aqui você vê uma visão consolidada de todos os seus destinos, diagnósticos e alertas em tempo real.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'erp-dash-1',
        title: 'Visão geral dos pilares',
        description: 'Os três gauges no topo mostram os scores médios dos pilares RA, OE e AO.',
        details: [
          'RA (Relações Ambientais): Avalia sustentabilidade e recursos naturais.',
          'OE (Organização Estrutural): Mede infraestrutura e governança.',
          'AO (Ações Operacionais): Analisa marketing, serviços e operação.',
          'Cada pilar varia de 0 a 100. Verde (>70), Amarelo (40-70), Vermelho (<40).',
        ],
        imagePath: '/tutorial/erp-dash-1.jpg',
      },
      {
        id: 'erp-dash-2',
        title: 'Alertas IGMA',
        description: 'O painel de alertas mostra situações que requerem atenção baseadas nas 6 regras do motor IGMA.',
        details: [
          'Alertas vermelhos indicam problemas críticos que bloqueiam avanços.',
          'Alertas amarelos são avisos de tendências preocupantes.',
          'Clique em um alerta para ver detalhes e ações recomendadas.',
          'Alertas persistentes (2+ ciclos) são destacados em vermelho escuro.',
        ],
        tips: ['Priorize alertas com "governance_block" pois impedem certificação do destino.'],
        imagePath: '/tutorial/erp-dash-2.jpg',
      },
      {
        id: 'erp-dash-3',
        title: 'Toggle Territorial vs Enterprise',
        description: 'Alterne entre a visão territorial (destinos) e enterprise (organizações) usando o toggle.',
        details: [
          'Visão Territorial: Foca nos dados do destino turístico.',
          'Visão Enterprise: Mostra dados das organizações do trade turístico.',
          'Cada visão tem KPIs e gráficos específicos.',
        ],
      },
      {
        id: 'erp-dash-4',
        title: 'Planos de ação e tendências',
        description: 'Na parte inferior, acompanhe planos de ação em andamento e tendências históricas.',
        details: [
          'O gráfico de tendências mostra a evolução dos scores ao longo dos ciclos.',
          'Planos de ação são vinculados a diagnósticos e issues específicos.',
          'Use o comparativo de destinos para benchmarking.',
        ],
        imagePath: '/tutorial/erp-dash-4.jpg',
      },
    ],
  },
  {
    topicId: 'erp-diagnosticos',
    title: 'Criar Diagnósticos',
    introduction: 'Os diagnósticos são o coração do SISTUR ERP. Através deles, você avalia sistematicamente um destino turístico usando indicadores baseados na metodologia de Mario Beni.',
    estimatedMinutes: 8,
    subSteps: [
      {
        id: 'erp-diag-1',
        title: 'Navegar para Diagnósticos',
        description: 'No menu lateral, clique em "Diagnósticos" para ver todos os diagnósticos existentes.',
        details: [
          'A lista mostra todos os diagnósticos da sua organização.',
          'Filtros permitem buscar por destino, status ou período.',
          'Cada card mostra o status (rascunho, calculado, revisado).',
        ],
        imagePath: '/tutorial/erp-diag-1.jpg',
      },
      {
        id: 'erp-diag-2',
        title: 'Iniciar nova rodada',
        description: 'Clique em "Nova Rodada" e selecione o destino que será avaliado.',
        details: [
          'Escolha o destino turístico na lista (ou crie um novo em Destinos).',
          'Defina o título e o período da avaliação.',
          'Selecione os indicadores que serão avaliados nesta rodada.',
          'Você pode usar o template padrão ou personalizar os indicadores.',
        ],
        tips: ['Recomendamos usar todos os indicadores na primeira rodada para ter uma visão completa.'],
        imagePath: '/tutorial/erp-diag-2.jpg',
      },
      {
        id: 'erp-diag-3',
        title: 'Preencher indicadores',
        description: 'Para cada indicador, insira o valor observado no destino.',
        details: [
          'Os indicadores são organizados por pilar (RA, OE, AO).',
          'Cada indicador tem uma escala definida e descrição do que medir.',
          'Use dados de pesquisas de campo, bases oficiais ou estimativas qualificadas.',
          'Dados do IBGE podem ser importados automaticamente para alguns indicadores.',
        ],
        tips: [
          'O sistema pré-preenche automaticamente dados de IBGE, DATASUS, STN, CADASTUR e Mapa do Turismo Brasileiro.',
          'Revise os dados pré-preenchidos e confirme antes de prosseguir.',
          'Indicadores sem fonte oficial disponível serão direcionados para preenchimento manual.',
        ],
        imagePath: '/tutorial/erp-diag-3.jpg',
      },
      {
        id: 'erp-diag-4',
        title: 'Calcular e interpretar',
        description: 'Após preencher os indicadores, clique em "Calcular" para processar o diagnóstico.',
        details: [
          'O motor IGMA aplica 6 regras sistêmicas aos dados.',
          'Scores são normalizados para a escala 0-100 por pilar.',
          'Issues são identificadas automaticamente (indicadores abaixo do limiar).',
          'Prescrições são geradas para cada issue encontrada.',
          'Alertas IGMA são criados para padrões que requerem atenção.',
        ],
        imagePath: '/tutorial/erp-diag-4.jpg',
      },
      {
        id: 'erp-diag-5',
        title: 'Criar planos de ação',
        description: 'A partir das issues e prescrições, crie planos de ação concretos.',
        details: [
          'Cada plano de ação é vinculado a uma issue ou prescrição específica.',
          'Defina responsável, prazo e prioridade.',
          'Acompanhe o progresso na aba de Planos de Ação do Dashboard.',
          'Marque como concluído quando a ação for implementada.',
        ],
        tips: ['Comece pelos planos de alta prioridade vinculados a alertas IGMA.'],
      },
    ],
  },
  {
    topicId: 'erp-projetos',
    title: 'Gestão de Projetos',
    introduction: 'O módulo de Projetos permite organizar iniciativas de melhoria vinculadas aos diagnósticos. Gerencie fases, milestones e tarefas de forma estruturada.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'erp-proj-1',
        title: 'Criar um projeto',
        description: 'Na página de Projetos, clique em "Novo Projeto" e preencha as informações básicas.',
        details: [
          'Dê um nome descritivo ao projeto.',
          'Vincule a um diagnóstico e destino específicos.',
          'Defina datas de início e fim previstas.',
          'Adicione uma descrição dos objetivos.',
        ],
        imagePath: '/tutorial/erp-proj-1.jpg',
      },
      {
        id: 'erp-proj-2',
        title: 'Organizar em fases e tarefas',
        description: 'Dentro do projeto, crie fases para organizar o trabalho e adicione tarefas a cada fase.',
        details: [
          'Fases representam etapas macro do projeto (ex: Planejamento, Execução, Avaliação).',
          'Tarefas são atividades específicas dentro de cada fase.',
          'Milestones marcam entregas importantes.',
          'Arraste para reordenar fases e tarefas.',
        ],
      },
      {
        id: 'erp-proj-3',
        title: 'Acompanhar progresso',
        description: 'O painel do projeto mostra o progresso geral e por fase.',
        details: [
          'A barra de progresso é calculada automaticamente com base nas tarefas concluídas.',
          'Tarefas atrasadas são destacadas em vermelho.',
          'Use o Dashboard ERP para uma visão consolidada de todos os projetos.',
        ],
      },
    ],
  },
  {
    topicId: 'erp-monitoring',
    title: 'Monitoramento ERP',
    introduction: 'O painel de Monitoramento ERP oferece uma visão executiva da evolução dos seus destinos turísticos ao longo do tempo.',
    estimatedMinutes: 4,
    subSteps: [
      {
        id: 'erp-mon-1',
        title: 'Evolução dos ciclos',
        description: 'O gráfico principal mostra como os scores dos 3 pilares evoluíram entre rodadas de diagnóstico.',
        details: [
          'Cada ponto no gráfico representa uma rodada de diagnóstico.',
          'Compare a evolução entre pilares para identificar desequilíbrios.',
          'Tendências de queda são destacadas com alertas.',
        ],
        imagePath: '/tutorial/erp-mon-1.jpg',
      },
      {
        id: 'erp-mon-2',
        title: 'Projetos e planos ativos',
        description: 'Veja todos os projetos em andamento, planos atrasados e métricas de execução.',
        details: [
          'Cards de estatísticas mostram total de projetos, tarefas e conclusões.',
          'Lista de projetos atrasados com dias de atraso.',
          'Planos recentes com status atualizado.',
        ],
      },
    ],
  },
  {
    topicId: 'erp-reports',
    title: 'Relatórios',
    introduction: 'Gere relatórios completos dos diagnósticos para apresentações, tomada de decisão e prestação de contas.',
    estimatedMinutes: 3,
    subSteps: [
      {
        id: 'erp-rep-1',
        title: 'Selecionar diagnóstico',
        description: 'Na página de Relatórios, escolha o diagnóstico para o qual deseja gerar o relatório.',
        details: [
          'Apenas diagnósticos com status "calculado" podem gerar relatórios.',
          'Selecione o formato desejado (PDF, visualização em tela).',
        ],
        imagePath: '/tutorial/erp-rep-1.jpg',
      },
      {
        id: 'erp-rep-2',
        title: 'Personalizar e exportar',
        description: 'O relatório inclui gráficos, scores, issues e recomendações.',
        details: [
          'Seções incluem: resumo executivo, scores por pilar, indicadores detalhados.',
          'Gráficos comparativos com rodadas anteriores.',
          'Lista de issues e prescrições do motor IGMA.',
          'Exporte em PDF para compartilhar com stakeholders.',
        ],
        tips: ['Relatórios são um recurso do plano Pro e Enterprise.'],
      },
    ],
  },

  // ─── EDU ESTUDANTE ───
  {
    topicId: 'edu-catalog',
    title: 'Catálogo de Cursos',
    introduction: 'O SISTUR EDU oferece um catálogo completo de trilhas e capacitações organizadas por pilar, com videoaulas, materiais e avaliações.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'edu-cat-1',
        title: 'Explorar o catálogo',
        description: 'Acesse "EDU" no menu lateral para ver todas as trilhas e capacitações disponíveis.',
        details: [
          'O catálogo é organizado por pilar (RA, OE, AO).',
          'Cada trilha agrupa várias capacitações em sequência.',
          'Filtros por tema, nível e pilar ajudam a encontrar conteúdo relevante.',
          'Tags indicam duração estimada e certificação.',
        ],
        imagePath: '/tutorial/edu-cat-1.jpg',
      },
      {
        id: 'edu-cat-2',
        title: 'Matricular-se em uma trilha',
        description: 'Clique em uma trilha para ver os detalhes e clique em "Matricular" para iniciar.',
        details: [
          'A matrícula é gratuita durante o período de trial.',
          'Após matricular, a trilha aparece em "Minhas Trilhas".',
          'Você pode se matricular em várias trilhas simultaneamente.',
          'O progresso é salvo automaticamente.',
        ],
        imagePath: '/tutorial/edu-cat-2.jpg',
      },
      {
        id: 'edu-cat-3',
        title: 'Assistir capacitações',
        description: 'Dentro da trilha, clique em uma capacitação para assistir ao conteúdo.',
        details: [
          'Vídeos podem ser assistidos em velocidade 1x, 1.5x ou 2x.',
          'Materiais complementares ficam disponíveis abaixo do vídeo.',
          'O progresso é atualizado conforme você avança no vídeo.',
          'Após completar, marque como concluído para avançar.',
        ],
        tips: ['Assista os vídeos em sequência — muitos conteúdos são complementares.'],
      },
    ],
  },
  {
    topicId: 'edu-profile',
    title: 'Perfil de Estudante',
    introduction: 'Preencha seu perfil educacional para receber recomendações personalizadas de conteúdo baseadas nos seus interesses e objetivos.',
    estimatedMinutes: 3,
    subSteps: [
      {
        id: 'edu-prof-1',
        title: 'Acessar o perfil',
        description: 'No menu EDU, clique em "Meu Perfil" para configurar suas preferências.',
        details: [
          'Selecione seus pilares de interesse (RA, OE, AO).',
          'Indique seu nível de experiência em turismo.',
          'Informe sua disponibilidade semanal de horas para estudo.',
          'Escolha temas de interesse específicos.',
        ],
        imagePath: '/tutorial/edu-prof-1.jpg',
      },
      {
        id: 'edu-prof-2',
        title: 'Receber recomendações',
        description: 'Com o perfil preenchido, o sistema sugere trilhas e capacitações personalizadas.',
        details: [
          'As recomendações consideram seus interesses, nível e disponibilidade.',
          'Recomendações são atualizadas conforme você completa conteúdos.',
          'Você pode descartar recomendações que não interessam.',
        ],
      },
    ],
  },
  {
    topicId: 'edu-referral',
    title: 'Código do Professor',
    introduction: 'Se você foi convidado por um professor, use o código de referral para se vincular a ele e participar de turmas.',
    estimatedMinutes: 2,
    subSteps: [
      {
        id: 'edu-ref-1',
        title: 'Inserir o código',
        description: 'Durante o cadastro ou no seu perfil, insira o código de referral fornecido pelo professor.',
        details: [
          'O código é um texto curto (ex: PROF-ABC123).',
          'Inserir o código vincula você automaticamente ao professor.',
          'O professor poderá ver seu progresso e atribuir conteúdos.',
        ],
      },
      {
        id: 'edu-ref-2',
        title: 'Participar de turmas',
        description: 'Após vinculação, o professor pode adicioná-lo a turmas (salas).',
        details: [
          'Você receberá notificação quando for adicionado a uma sala.',
          'Conteúdos atribuídos pelo professor aparecerão automaticamente.',
          'Prazos definidos pelo professor serão visíveis no seu painel.',
        ],
      },
    ],
  },
  {
    topicId: 'edu-certificates',
    title: 'Certificados',
    introduction: 'Ao completar trilhas e provas, você recebe certificados digitais verificáveis com QR Code, reconhecendo sua capacitação.',
    estimatedMinutes: 3,
    subSteps: [
      {
        id: 'edu-cert-1',
        title: 'Como ganhar certificados',
        description: 'Complete todos os módulos de uma trilha e, quando houver, passe na prova final.',
        details: [
          'Trilhas: Complete 100% do conteúdo para receber o certificado de trilha.',
          'Provas: Alcance a nota mínima definida para cada exame.',
          'Certificados são emitidos automaticamente após conclusão.',
        ],
        imagePath: '/tutorial/edu-cert-1.jpg',
      },
      {
        id: 'edu-cert-2',
        title: 'Visualizar e compartilhar',
        description: 'Acesse "Certificados" no menu para ver todos os seus certificados emitidos.',
        details: [
          'Cada certificado tem um código de verificação único.',
          'QR Code permite verificação pública por qualquer pessoa.',
          'Baixe o certificado em PDF para impressão ou compartilhamento.',
          'O link de verificação pública pode ser adicionado ao LinkedIn.',
        ],
      },
    ],
  },
  {
    topicId: 'edu-games',
    title: 'Jogos Educacionais',
    introduction: 'O SISTUR oferece 4 jogos educacionais que ensinam conceitos de turismo sustentável de forma lúdica e envolvente.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'edu-games-1',
        title: 'Hub de Jogos',
        description: 'Acesse o Hub de Jogos pelo menu lateral para ver todos os jogos disponíveis.',
        details: [
          'TCG Guardião do Território: Jogo de cartas estratégico.',
          'RPG Missão Bioma: Aventura narrativa com escolhas.',
          'Jogo da Memória: Teste seus conhecimentos sobre indicadores.',
          'Caça ao Tesouro: Explore grades e resolva enigmas.',
        ],
        imagePath: '/tutorial/edu-games-1.jpg',
      },
      {
        id: 'edu-games-2',
        title: 'TCG — Guardião do Território',
        description: 'Monte seu deck de cartas e defenda o destino turístico contra ameaças.',
        details: [
          'Cada carta representa um indicador ou ameaça do turismo.',
          'Use cartas de ação para combater ameaças no campo de batalha.',
          'Aprenda sobre os pilares RA, OE e AO jogando.',
          'Sessões são salvas automaticamente.',
        ],
      },
      {
        id: 'edu-games-3',
        title: 'RPG — Missão Bioma',
        description: 'Escolha um bioma brasileiro e tome decisões que afetam a sustentabilidade do destino.',
        details: [
          'Cada escolha impacta métricas de sustentabilidade, economia e comunidade.',
          'Cenários são baseados em situações reais do turismo brasileiro.',
          'Ao final, receba um relatório educacional com o que aprendeu.',
        ],
      },
    ],
  },

  // ─── PROFESSOR ───
  {
    topicId: 'prof-referral',
    title: 'Sistema de Referral',
    introduction: 'Como professor, você tem um código e link de convite únicos. Use-os para vincular alunos à sua conta e gerenciar turmas.',
    estimatedMinutes: 4,
    subSteps: [
      {
        id: 'prof-ref-1',
        title: 'Encontrar seu código',
        description: 'Acesse o Painel do Professor e veja seu código de referral no topo da página.',
        details: [
          'O código é gerado automaticamente quando seu perfil de professor é aprovado.',
          'O link de convite pode ser compartilhado diretamente (WhatsApp, email, etc.).',
          'Alunos que usam seu código são vinculados automaticamente a você.',
        ],
        imagePath: '/tutorial/prof-ref-1.jpg',
      },
      {
        id: 'prof-ref-2',
        title: 'Compartilhar com alunos',
        description: 'Envie o código ou link para seus alunos antes ou durante o cadastro.',
        details: [
          'Alunos podem inserir o código durante o onboarding.',
          'Alunos já cadastrados podem adicionar o código no perfil.',
          'O link leva direto à página de cadastro com o código preenchido.',
        ],
        tips: ['Cole o link no grupo da turma no WhatsApp para facilitar.'],
      },
      {
        id: 'prof-ref-3',
        title: 'Benefício de isenção',
        description: 'Com 5 ou mais alunos ativos vinculados, sua mensalidade é isenta automaticamente!',
        details: [
          'O contador de alunos ativos é atualizado em tempo real.',
          'Alunos inativos por 30+ dias não contam para a isenção.',
          'A isenção é aplicada automaticamente na próxima cobrança.',
          'Veja o status da isenção no seu Painel do Professor.',
        ],
      },
    ],
  },
  {
    topicId: 'prof-classrooms',
    title: 'Gestão de Salas',
    introduction: 'Crie turmas organizadas por disciplina e período para gerenciar seus alunos e atribuir conteúdo de forma estruturada.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'prof-class-1',
        title: 'Criar uma sala',
        description: 'No Painel do Professor, clique em "Nova Sala" para criar uma turma.',
        details: [
          'Defina o nome da sala (ex: "Turismo Sustentável 2025.1").',
          'Informe a disciplina associada.',
          'Defina o período (data de início e fim).',
          'Adicione uma descrição opcional.',
        ],
        imagePath: '/tutorial/prof-class-1.jpg',
      },
      {
        id: 'prof-class-2',
        title: 'Matricular alunos',
        description: 'Adicione alunos referenciados às suas salas.',
        details: [
          'Somente alunos vinculados via referral aparecem na lista.',
          'Selecione os alunos e clique em "Matricular".',
          'Alunos podem ser removidos da sala a qualquer momento.',
          'Um aluno pode estar em múltiplas salas.',
        ],
      },
    ],
  },
  {
    topicId: 'prof-assignments',
    title: 'Atribuição de Conteúdo',
    introduction: 'Atribua trilhas, capacitações, provas ou conteúdo próprio às suas salas. Defina prazos e acompanhe a conclusão.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'prof-assign-1',
        title: 'Criar uma atribuição',
        description: 'Na sala, clique em "Nova Atribuição" para definir o conteúdo.',
        details: [
          'Escolha o tipo: Trilha, Capacitação, Prova ou Conteúdo Próprio.',
          'Selecione o conteúdo do catálogo ou crie conteúdo customizado.',
          'Defina a data de disponibilidade (quando os alunos poderão acessar).',
          'Defina o prazo de entrega (deadline).',
        ],
        imagePath: '/tutorial/prof-assign-1.jpg',
      },
      {
        id: 'prof-assign-2',
        title: 'Acompanhar entregas',
        description: 'Veja quais alunos completaram cada atribuição.',
        details: [
          'O painel mostra status por aluno: pendente, em andamento, concluído.',
          'Filtre por sala ou atribuição específica.',
          'Veja notas de provas e percentual de conclusão.',
        ],
      },
    ],
  },
  {
    topicId: 'prof-monitoring',
    title: 'Acompanhamento de Alunos',
    introduction: 'Monitore o progresso dos seus alunos em tempo real. Veja quem está engajado, quem está atrasado e o desempenho geral da turma.',
    estimatedMinutes: 3,
    subSteps: [
      {
        id: 'prof-mon-1',
        title: 'Visão por sala',
        description: 'Selecione uma sala para ver o progresso consolidado da turma.',
        details: [
          'Percentual médio de conclusão da turma.',
          'Lista de alunos com status individual.',
          'Destaques: melhor desempenho e alunos com dificuldade.',
        ],
        imagePath: '/tutorial/prof-mon-1.jpg',
      },
      {
        id: 'prof-mon-2',
        title: 'Detalhes por aluno',
        description: 'Clique em um aluno para ver seu progresso detalhado.',
        details: [
          'Trilhas matriculadas e percentual de conclusão de cada uma.',
          'Notas em provas realizadas.',
          'Última atividade e tempo total de estudo.',
          'Histórico de certificados emitidos.',
        ],
      },
    ],
  },

  // ─── ADMIN ───
  {
    topicId: 'admin-users',
    title: 'Gestão de Usuários',
    introduction: 'Como administrador, você gerencia todos os usuários da plataforma: aprovações, papéis, organizações e acessos.',
    estimatedMinutes: 5,
    subSteps: [
      {
        id: 'admin-users-1',
        title: 'Aprovar novos usuários',
        description: 'Acesse Configurações > Aprovações Pendentes para ver novos cadastros.',
        details: [
          'Cada solicitação mostra nome, email, organização e papel solicitado.',
          'Revise os dados e clique em "Aprovar" ou "Rejeitar".',
          'O usuário recebe um email automático informando a decisão.',
          'Aprovações pendentes aparecem como notificação no menu.',
        ],
        imagePath: '/tutorial/admin-users-1.jpg',
      },
      {
        id: 'admin-users-2',
        title: 'Gerenciar papéis',
        description: 'Altere o papel de qualquer usuário na lista de usuários.',
        details: [
          'Papéis disponíveis: Admin, Analista, Viewer, Estudante, Professor.',
          'Admins têm acesso total à plataforma.',
          'Analistas podem criar diagnósticos e planos de ação.',
          'Viewers podem apenas visualizar dados.',
        ],
      },
      {
        id: 'admin-users-3',
        title: 'Gerenciar organizações',
        description: 'Crie e gerencie organizações para agrupar usuários.',
        details: [
          'Organizações controlam o escopo dos dados visíveis.',
          'Cada organização pode ter múltiplos destinos.',
          'Usuários de uma organização não veem dados de outras.',
          'Transfira usuários entre organizações quando necessário.',
        ],
      },
    ],
  },
  {
    topicId: 'admin-licenses',
    title: 'Gestão de Licenças',
    introduction: 'Gerencie todas as licenças de uso da plataforma: visualize trials, assinaturas ativas, cancele ou estenda acessos.',
    estimatedMinutes: 4,
    subSteps: [
      {
        id: 'admin-lic-1',
        title: 'Painel de licenças',
        description: 'Acesse Admin > Licenças para ver todas as licenças do sistema.',
        details: [
          'Filtros por tipo: Trial, Basic, Pro, Enterprise.',
          'Status: Ativa, Expirada, Cancelada.',
          'Métricas de conversão trial → pago.',
          'Busque por nome ou email do usuário.',
        ],
        imagePath: '/tutorial/admin-lic-1.jpg',
      },
      {
        id: 'admin-lic-2',
        title: 'Ações sobre licenças',
        description: 'Realize ações administrativas sobre licenças específicas.',
        details: [
          'Cancelar: Revoga o acesso do usuário imediatamente.',
          'Estender trial: Adiciona dias ao período de teste.',
          'Upgrade: Muda o plano do usuário.',
          'Todas as ações são registradas no log de auditoria.',
        ],
      },
    ],
  },
  {
    topicId: 'admin-edu',
    title: 'Gestão EDU',
    introduction: 'Administre todo o conteúdo educacional da plataforma: treinamentos, banco de questões, regras de exames e conteúdo importado.',
    estimatedMinutes: 6,
    subSteps: [
      {
        id: 'admin-edu-1',
        title: 'Gerenciar treinamentos',
        description: 'Crie e edite capacitações no catálogo de treinamentos.',
        details: [
          'Adicione título, descrição, pilar e URL do vídeo.',
          'Defina duração estimada e nível de dificuldade.',
          'Vincule a trilhas existentes ou crie novas.',
          'Ative ou desative treinamentos no catálogo.',
        ],
        imagePath: '/tutorial/admin-edu-1.jpg',
      },
      {
        id: 'admin-edu-2',
        title: 'Banco de questões',
        description: 'Gerencie o banco de questões usado nos exames.',
        details: [
          'Crie questões de múltipla escolha vinculadas a pilares e temas.',
          'Defina nível de dificuldade e tags.',
          'Questões são selecionadas aleatoriamente nas provas.',
          'Revise e edite questões existentes.',
        ],
      },
      {
        id: 'admin-edu-3',
        title: 'Regras de exames',
        description: 'Configure as regras para criação de provas.',
        details: [
          'Defina número de questões por prova.',
          'Configure nota mínima para aprovação.',
          'Ative/desative proteção anti-cola (tab switch detection).',
          'Defina limite de tempo para cada prova.',
        ],
      },
    ],
  },
  {
    topicId: 'admin-settings',
    title: 'Configurações do Sistema',
    introduction: 'Acesse configurações avançadas para controlar o comportamento da plataforma.',
    estimatedMinutes: 4,
    subSteps: [
      {
        id: 'admin-set-1',
        title: 'Modo Demo',
        description: 'Ative o modo demo para demonstrações com dados fictícios.',
        details: [
          'O modo demo carrega dados de exemplo em todos os módulos.',
          'Útil para apresentações e treinamentos internos.',
          'Dados reais não são afetados.',
        ],
      },
      {
        id: 'admin-set-2',
        title: 'Logs de auditoria',
        description: 'Visualize todas as ações realizadas na plataforma.',
        details: [
          'Registros incluem: quem, o que, quando e de onde.',
          'Filtre por tipo de evento, usuário ou período.',
          'Exporte logs para análise externa.',
          'Eventos críticos são destacados automaticamente.',
        ],
        imagePath: '/tutorial/admin-set-2.jpg',
      },
      {
        id: 'admin-set-3',
        title: 'Gestão de feedback',
        description: 'Veja e gerencie feedbacks enviados pelos usuários.',
        details: [
          'Feedbacks são classificados por tipo: bug, sugestão, elogio.',
          'Marque como lido, em andamento ou resolvido.',
          'Use os feedbacks para priorizar melhorias na plataforma.',
        ],
      },
    ],
  },

  // ─── COMUNIDADE ───
  {
    topicId: 'comm-forum',
    title: 'Social Turismo',
    introduction: 'O fórum da comunidade SISTUR é o espaço para troca de experiências, dúvidas e boas práticas entre profissionais do turismo.',
    estimatedMinutes: 4,
    subSteps: [
      {
        id: 'comm-forum-1',
        title: 'Navegar pelo fórum',
        description: 'Acesse "Social" no menu lateral para ver os posts da comunidade.',
        details: [
          'Posts são organizados por data (mais recentes primeiro).',
          'Use tags para filtrar por assunto.',
          'Curtidas e comentários aparecem em cada post.',
          'Posts fixados são exibidos no topo.',
        ],
        imagePath: '/tutorial/comm-forum-1.jpg',
      },
      {
        id: 'comm-forum-2',
        title: 'Criar um post',
        description: 'Clique em "Novo Post" para compartilhar com a comunidade.',
        details: [
          'Escolha um título descritivo.',
          'Escreva o conteúdo do post com formatação.',
          'Adicione tags relevantes (ex: sustentabilidade, governança).',
          'Posts podem incluir links e referências.',
        ],
      },
      {
        id: 'comm-forum-3',
        title: 'Interagir com posts',
        description: 'Comente, curta e denuncie conteúdos conforme necessário.',
        details: [
          'Comente para contribuir com a discussão.',
          'Curta posts e comentários úteis.',
          'Denuncie conteúdo inadequado para moderação.',
          'Você recebe notificações de respostas aos seus posts.',
        ],
      },
    ],
  },
];

/** Find detailed steps for a given topic ID */
export function getTopicDetail(topicId: string): TutorialTopicDetail | undefined {
  return tutorialTopicDetails.find(t => t.topicId === topicId);
}

/** Get all topic IDs that have detailed steps */
export function getDetailedTopicIds(): string[] {
  return tutorialTopicDetails.map(t => t.topicId);
}
