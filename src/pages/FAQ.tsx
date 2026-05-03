import { AppLayout } from '@/components/layout/AppLayout';
import { ajudaNav } from '@/components/layout/eduSubNav';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircleQuestion, GraduationCap, BarChart3, Hotel } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'edu' | 'erp' | 'enterprise';
}

export const faqItems: FAQItem[] = [
  // General questions (visible to all)
  {
    question: 'O que é o SISTUR?',
    answer: 'O SISTUR é um Sistema de Inteligência Territorial para o Turismo que transforma indicadores públicos em decisões estratégicas e capacitação aplicada, fechando o ciclo entre diagnóstico, ação e resultado. O sistema é baseado nos princípios sistêmicos de Mario Beni.',
    category: 'general',
  },
  {
    question: 'O que são os três pilares (RA, OE, AO)?',
    answer: 'Os três pilares do SISTUR são: RA (Relações Ambientais) - aspectos ambientais e sustentabilidade, é o pilar prioritário; OE (Organização Estrutural) - infraestrutura e organização do destino; AO (Ações Operacionais) - operações, serviços turísticos e governança central do sistema.',
    category: 'general',
  },
  {
    question: 'O que é o Motor IGMA (Mario Beni)?',
    answer: 'O Motor IGMA é o núcleo inteligente do SISTUR que aplica 6 regras sistêmicas baseadas na teoria de Mario Beni: (1) Prioridade RA - limitações ambientais bloqueiam expansão estrutural; (2) Ciclo contínuo - revisões programadas por severidade; (3) Externalidades negativas - alerta quando OE melhora mas RA piora; (4) Governança central - AO crítico bloqueia todo o sistema; (5) Marketing bloqueado se RA ou AO críticos; (6) Interdependência setorial identificada.',
    category: 'general',
  },
  {
    question: 'Qual a diferença entre Organizações Públicas e Privadas?',
    answer: 'O SISTUR classifica organizações em dois tipos: PÚBLICAS (secretarias de turismo, órgãos governamentais) com foco em diagnósticos territoriais de municípios, e PRIVADAS (hotéis, resorts, empresas hoteleiras) com acesso opcional ao módulo Enterprise para indicadores específicos de hospitalidade.',
    category: 'general',
  },

  // EDU-specific questions
  {
    question: 'Como funcionam as trilhas de aprendizagem?',
    answer: 'As trilhas são sequências de treinamentos organizados por tema ou pilar (RA, OE, AO). Cada trilha contém múltiplos módulos com vídeos, materiais e avaliações. Você pode acompanhar seu progresso e receber certificado ao concluir.',
    category: 'edu',
  },
  {
    question: 'Como obtenho meu certificado?',
    answer: 'Para obter o certificado de uma trilha, você precisa: 1) Completar todos os treinamentos obrigatórios; 2) Atingir a pontuação mínima nas avaliações (quando aplicável); 3) Clicar em "Emitir Certificado" na página da trilha. O certificado inclui QR Code para verificação de autenticidade.',
    category: 'edu',
  },
  {
    question: 'O que são treinamentos prescritos?',
    answer: 'Treinamentos prescritos são recomendações automáticas geradas pelo Motor IGMA baseadas nos resultados dos diagnósticos territoriais. Quando um indicador apresenta status crítico ou em atenção, o sistema recomenda cursos específicos para aquele tema.',
    category: 'edu',
  },
  {
    question: 'Posso acessar os treinamentos a qualquer momento?',
    answer: 'Sim! Todo o conteúdo educacional está disponível 24/7. Você pode pausar e retomar de onde parou a qualquer momento. Seu progresso é salvo automaticamente.',
    category: 'edu',
  },
  {
    question: 'Como funciona a verificação de certificados?',
    answer: 'Cada certificado possui um QR Code e um código único que pode ser verificado na página pública de verificação. Isso permite que terceiros confirmem a autenticidade do certificado sem precisar de login.',
    category: 'edu',
  },
  {
    question: 'Quem são os agentes-alvo dos cursos?',
    answer: 'Os cursos são direcionados a três perfis: Gestores Públicos (responsáveis por políticas), Técnicos (profissionais de planejamento) e Trade Turístico (empresários e operadores do setor).',
    category: 'edu',
  },
  {
    question: 'Como o professor agenda uma prova ou trilha para a turma?',
    answer: 'No Painel do Professor, na aba "Atividades", o professor cria uma atribuição informando: tipo (prova, trilha ou treinamento), título, descrição, data e horário de liberação (available_from), prazo final (due_date) e alunos-alvo (toda a turma ou indivíduos selecionados). É possível ainda definir regras específicas para aquela atividade — limite de tempo, número de tentativas e nota mínima — sem alterar a configuração global da prova. Os alunos-alvo recebem uma notificação automática na central de avisos no momento da criação.',
    category: 'edu',
  },
  {
    question: 'Como o aluno acessa as atividades atribuídas pelo professor?',
    answer: 'O aluno acessa "Minhas Atividades" (/edu/minhas-atividades) e visualiza todas as atribuições com janela de disponibilidade, prazo e status. Ao clicar em "Iniciar" em uma prova, o servidor valida automaticamente a janela, o número de tentativas restantes e a matrícula na turma — gera a prova com amostragem estratificada de questões (30% fáceis, 50% médias, 20% difíceis), aplica overrides definidos pelo professor e redireciona o aluno direto para a tela de execução.',
    category: 'edu',
  },
  {
    question: 'Como o professor acompanha o desempenho da turma em uma atividade?',
    answer: 'Cada atividade no Painel do Professor possui um botão "Acompanhar" que abre um drill-down com KPIs (taxa de conclusão, taxa de aprovação, nota média) e o status individual de cada aluno: não iniciou, em andamento, aguarda correção, reprovado (pode tentar novamente), esgotou tentativas ou aprovado. É possível filtrar por status clicando nos chips e executar ações em massa: enviar lembrete (para todos pendentes, não iniciantes ou não entregues), prorrogar o prazo da atividade ou liberar tentativas extras. Todas as ações disparam notificações automáticas para os alunos-alvo.',
    category: 'edu',
  },
  {
    question: 'Como funcionam as provas finais das trilhas formativas?',
    answer: 'Toda trilha pode ter provas finais por pilar coberto (RA, OE e/ou AO). A configuração padrão usa 20 questões, nota mínima de 70%, 60 minutos de duração e 2 tentativas. Ao criar uma trilha, o checkbox "Gerar provas finais automaticamente" (marcado por padrão) cria os rulesets imediatamente; o botão "Gerar provas" no detalhe da trilha permite regenerar a qualquer momento. As trilhas pré-prontas existentes receberam backfill automático dessas provas.',
    category: 'edu',
  },
  {
    question: 'Como funciona o sistema anti-fraude nos exames?',
    answer: 'O SISTUR EDU rastreia toda a sessão da prova: heartbeats periódicos, mudanças de aba/janela, tentativa de copiar/colar e tempo gasto por questão. A correção de questões objetivas é instantânea no servidor; questões dissertativas seguem para correção manual via RPC finalize_essay_grading (que centraliza nota + emissão de certificado). Certificados só são emitidos após validação completa, com QR Code de verificação pública.',
    category: 'edu',
  },

  // ERP-specific questions
  {
    question: 'Por que RA tem prioridade sobre os outros pilares?',
    answer: 'Segundo Mario Beni, as Relações Ambientais (RA) são a base do sistema turístico. Se o ambiente está degradado, não adianta investir em infraestrutura (OE). Por isso, quando RA está crítico, o sistema bloqueia capacitações de OE até que as questões ambientais sejam resolvidas.',
    category: 'erp',
  },
  {
    question: 'O que significa "Marketing Bloqueado"?',
    answer: 'O sistema bloqueia ações de marketing/promoção turística quando RA (ambiente) ou AO (operações) estão críticos. Promover um destino com problemas ambientais graves ou falhas operacionais sérias pode gerar externalidades negativas e danos à reputação.',
    category: 'erp',
  },
  {
    question: 'Como funciona o pré-preenchimento de dados oficiais?',
    answer: 'O sistema busca apenas dados realmente disponíveis nas bases públicas integradas ao fluxo atual, usando o código IBGE do município. O total pode variar conforme a disponibilidade de cada fonte para o município, e todo dado retornado é exibido com fonte, ano e nível de confiança antes da validação humana obrigatória.',
    category: 'erp',
  },
  {
    question: 'Por que preciso validar os dados pré-preenchidos?',
    answer: 'A validação humana é obrigatória para garantir legitimidade institucional e evitar questionamentos políticos. Nenhum dado automático é "verdade absoluta". O diagnóstico só é calculado após o usuário confirmar ou ajustar cada valor.',
    category: 'erp',
  },
  {
    question: 'Quais são as fontes de dados oficiais?',
    answer: 'O SISTUR consulta automaticamente 8 fontes oficiais para pré-preencher mais de 25 indicadores: (1) IBGE Agregados — População, PIB per capita, Densidade e Área; (2) IBGE SIDRA/Censo 2010 — Abastecimento de água e Coleta de lixo; (3) IBGE Pesquisas — IDH, Gini, Incidência de pobreza; (4) DATASUS — Leitos hospitalares, Cobertura de saúde, Mortalidade infantil e geral; (5) INEP — IDEB; (6) STN/Tesouro Nacional — Receita própria e Despesa com turismo; (7) CADASTUR/dados.gov.br — Guias e Agências de turismo (datasets abertos com ingestão trimestral); (8) Mapa do Turismo Brasileiro (mapa.turismo.gov.br) — Região turística, Categoria (A-E), Empregos, Estabelecimentos, Visitantes, Arrecadação e Conselho municipal; (9) ANA/Hidroweb (Qualiágua) — IQA médio das estações de monitoramento do município (alimenta o pilar RA). Quando uma base não retorna dado válido para o município, o indicador permanece fora do pré-preenchimento e segue para preenchimento manual com confirmação humana obrigatória.',
    category: 'erp',
  },
  {
    question: 'Como o IQA da ANA é integrado ao diagnóstico?',
    answer: 'O SISTUR consulta a API pública da Agência Nacional de Águas (Hidroweb/Qualiágua) usando o código IBGE do município para recuperar o Índice de Qualidade da Água (IQA) médio das estações de monitoramento ativas. O valor é exibido com a quantidade de estações usadas no cálculo, o ano de referência e o nível de confiança. Esse indicador alimenta diretamente o pilar RA (Relações Ambientais), agregando uma base hídrica oficial ao diagnóstico territorial. Municípios sem estação ativa permanecem com o indicador vazio para preenchimento manual.',
    category: 'erp',
  },
  {
    question: 'O que é o Mapa do Turismo Brasileiro integrado ao SISTUR?',
    answer: 'O Mapa do Turismo Brasileiro é o programa oficial do Ministério do Turismo que classifica municípios em categorias (A a E) e regiões turísticas. O SISTUR se integra diretamente à API REST (mapa.turismo.gov.br) para buscar em tempo real dados como: categoria do município, região turística, quantidade de empregos e estabelecimentos turísticos, estimativas de visitantes nacionais e internacionais, arrecadação do turismo e existência de conselho municipal de turismo.',
    category: 'erp',
  },
  {
    question: 'Como funciona o diagnóstico?',
    answer: 'O diagnóstico coleta valores de indicadores que são normalizados em uma escala de 0 a 1. O Motor IGMA aplica as 6 regras de Mario Beni, gerando alertas sistêmicos, bloqueios e a data de próxima revisão recomendada. Cada indicador recebe um status automático (Adequado, Atenção ou Crítico).',
    category: 'erp',
  },
  {
    question: 'O que é a interpretação territorial?',
    answer: 'A interpretação territorial classifica os problemas identificados em três categorias: Estrutural (limitações históricas/socioeconômicas), Gestão (falhas de planejamento/coordenação) ou Entrega (falhas na execução de serviços).',
    category: 'erp',
  },
  {
    question: 'Como são geradas as prescrições de cursos?',
    answer: 'As prescrições são geradas automaticamente quando um indicador apresenta status Atenção ou Crítico. O Motor IGMA pode bloquear certas prescrições (ex: cursos de OE quando RA está crítico). O curso prescrito deve corresponder ao pilar do indicador e à interpretação territorial identificada.',
    category: 'erp',
  },
  {
    question: 'O que significa cada status?',
    answer: 'Adequado (verde): score ≥ 0.67, indica bom desempenho. Atenção (amarelo): score entre 0.34 e 0.66, requer monitoramento. Crítico (vermelho): score ≤ 0.33, requer ação imediata e pode ativar bloqueios IGMA.',
    category: 'erp',
  },
  {
    question: 'Quando é recomendada a próxima revisão?',
    answer: 'O Motor IGMA calcula automaticamente a data de próxima revisão baseado na severidade: pilares críticos = 6 meses, pilares em atenção = 12 meses, todos adequados = 18 meses. Esta data aparece nos alertas do diagnóstico.',
    category: 'erp',
  },
  {
    question: 'O que são externalidades negativas no turismo?',
    answer: 'Externalidades negativas ocorrem quando o crescimento estrutural (OE) acontece às custas do ambiente (RA). O sistema detecta isso quando OE melhora entre ciclos mas RA piora, gerando um alerta específico de externalidade.',
    category: 'erp',
  },
  {
    question: 'Como funciona o monitoramento de ciclos?',
    answer: 'O sistema acompanha a evolução dos indicadores entre ciclos de avaliação, identificando se houve Evolução (melhora), Estagnação (sem mudança) ou Regressão (piora). Alertas são gerados quando há regressão por 2 ou mais ciclos consecutivos.',
    category: 'erp',
  },
  {
    question: 'O que acontece com os dados após a validação?',
    answer: 'Após a validação, os dados são "congelados" em um snapshot (diagnosis_data_snapshots) que preserva exatamente os valores usados em cada diagnóstico. O histórico nunca é sobrescrito, garantindo rastreabilidade completa.',
    category: 'erp',
  },
  {
    question: 'O que significa "Dependência Intersetorial"?',
    answer: 'Alguns indicadores dependem de ações de múltiplos setores (saúde, educação, meio ambiente, etc.). O sistema identifica esses indicadores e sinaliza que a melhoria requer articulação intersetorial, não apenas ações isoladas do turismo.',
    category: 'erp',
  },

  // Enterprise-specific questions
  {
    question: 'O que é o SISTUR Enterprise?',
    answer: 'O SISTUR Enterprise é o módulo especializado para organizações do setor privado (hotéis, resorts, redes hoteleiras). Utiliza 22 indicadores de hospitalidade adaptados da metodologia Mario Beni, sendo 6 compartilhados com diagnósticos territoriais (NPS, Reviews Online, Horas de Treinamento, % Funcionários Locais, % Compras Locais e Certificações Ambientais).',
    category: 'enterprise',
  },
  {
    question: 'Quais indicadores estão disponíveis no Enterprise?',
    answer: 'O Enterprise inclui indicadores em 7 categorias: Performance Financeira (RevPAR, ADR, GOP Margin), Experiência do Hóspede (NPS, Reviews Online), Operações (Taxa de Ocupação), Sustentabilidade (Consumo de Água/Energia, Certificações), RH (Turnover, Horas de Treinamento), e Impacto Local (% Funcionários Locais, % Compras Locais). 6 destes indicadores também são usados em diagnósticos territoriais.',
    category: 'enterprise',
  },
  {
    question: 'Como ativo o acesso Enterprise para minha organização?',
    answer: 'O acesso Enterprise é habilitado por administradores nas Configurações > Organizações. Selecione a organização, marque o tipo como "Privada" e ative o toggle "Acesso Enterprise". Isso libera os indicadores e fluxos específicos para hospitalidade.',
    category: 'enterprise',
  },
  {
    question: 'Os indicadores Enterprise seguem a mesma metodologia Beni?',
    answer: 'Sim! Os 22 indicadores Enterprise foram mapeados para os três pilares (RA, OE, AO) da teoria sistêmica de Mario Beni. Indicadores de sustentabilidade pertencem ao RA, infraestrutura ao OE, e operações ao AO. As mesmas 6 regras IGMA são aplicadas, e 6 indicadores (NPS, Reviews, Treinamento, Emprego Local, Compras Locais, Certificações) são compartilhados entre módulos.',
    category: 'enterprise',
  },
  {
    question: 'O que são indicadores de escopo compartilhado?',
    answer: 'São 6 indicadores que aparecem tanto em diagnósticos territoriais quanto empresariais: NPS, Nota de Reviews Online, Horas de Treinamento por Funcionário, % Funcionários Locais, % Compras Locais e Nº de Certificações Ambientais. Eles medem aspectos relevantes para ambos os contextos (público e privado).',
    category: 'enterprise',
  },
  {
    question: 'Posso usar SISTUR ERP e Enterprise na mesma organização?',
    answer: 'Uma organização privada com Enterprise habilitado pode usar tanto os indicadores territoriais padrão (quando aplicável) quanto os indicadores específicos de hospitalidade. Os 6 indicadores compartilhados facilitam a integração entre diagnósticos territoriais e empresariais. Organizações públicas não têm acesso ao módulo Enterprise.',
    category: 'enterprise',
  },

  // Mandala da Sustentabilidade no Turismo (MST) — extensão opcional
  {
    question: 'O que é a Mandala da Sustentabilidade no Turismo (MST)?',
    answer: 'A MST é uma extensão opcional (a partir da v1.28.0) baseada em Tasso, Silva & Nascimento (2024) que adiciona 9 indicadores complementares ao núcleo SISTUR — 4 em RA (acessibilidade NBR 9050, áreas verdes, balneabilidade, patrimônio), 3 em OE (conectividade 5G/Wi-Fi via Anatel, qualificação PNQT via CADASTUR, comparecimento eleitoral via TSE) e 2 em AO (promoção digital, Turismo de Base Comunitária). O Score Final SISTUR e a classificação são preservados — a MST adiciona profundidade sem quebrar comparabilidade.',
    category: 'general',
  },
  {
    question: 'Como ativo a Mandala (MST) num diagnóstico?',
    answer: 'Na criação de uma Nova Rodada Territorial, no Step 3 (Configurações), ative o switch "Expandir com Mandala da Sustentabilidade no Turismo". A flag fica salva no diagnóstico (assessments.expand_with_mandala) e os 9 indicadores MST passam a aparecer na coleta. Diagnósticos sem o opt-in continuam usando apenas o núcleo SISTUR original. Você pode filtrar o catálogo por "Núcleo SISTUR" vs "🌀 Mandala MST" no painel de Indicadores.',
    category: 'erp',
  },
  {
    question: 'Quais indicadores MST são preenchidos automaticamente?',
    answer: 'A automação MST é parcial e tem cobertura limitada por design. Para 15 destinos âncora pré-populados no cache (capitais brasileiras + Foz do Iguaçu, Olinda, Ribeirão Preto, Uberlândia), MST_TSE_TURNOUT (comparecimento eleitoral 2022/2024) e MST_5G_WIFI (cobertura 5G/4G/Wi-Fi público) são preenchidos automaticamente em <100ms via cache local (tse_turnout_cache e anatel_coverage_cache, com TTL de ciclo eleitoral e 90 dias respectivamente). Para os demais municípios, o sistema tenta scraping sob demanda via Firecrawl em fontes agregadoras (G1 Eleições, Teleco), mas como o TSE oficial usa SPA com hash routing e a Anatel publica via painel Leaflet, a maioria das tentativas falha e o indicador é registrado como linha MANUAL no painel de pré-preenchimento — com badge 🌀 MST, valor vazio e link direto para a fonte oficial (tse.jus.br/eleicoes/estatisticas e anatel.gov.br) para preenchimento humano. MST_PNQT_QUAL é alimentado pelo CADASTUR estendido (ingest-cadastur). Os demais 6 indicadores MST (acessibilidade, áreas verdes, balneabilidade, patrimônio, promoção digital, TBC) são sempre manuais com guidance contextual.',
    category: 'erp',
  },
  {
    question: 'Por que não vi nenhum indicador MST no meu pré-preenchimento?',
    answer: 'Três causas possíveis: (1) o diagnóstico foi criado SEM o opt-in "Expandir com Mandala (MST)" no Step 3 da Nova Rodada — nesse caso os indicadores MST nem aparecem (assessments.expand_with_mandala = false). (2) O município está fora das 15 capitais âncora E o scraping sob demanda falhou — nesse caso a linha MANUAL com valor vazio aparece no painel de validação com badge 🌀 MST, basta clicar em "Recarregar dados oficiais" e depois preencher manualmente com o valor da fonte oficial linkada na nota do indicador. (3) A função edge ingest-tse/ingest-anatel não conseguiu persistir por falta de configuração de fonte (external_data_sources) — esse problema foi corrigido na v1.30.7 com a inserção das fontes TSE e ANATEL. Recomendação: ative o switch MST, clique em "Recarregar dados oficiais" no painel de pré-preenchimento e os 9 indicadores MST aparecerão (alguns automáticos, outros como linha manual com link à fonte).',
    category: 'erp',
  },
  {
    question: 'O que é o componente "Mandala do Destino" no Dashboard?',
    answer: 'É a visualização circular dos 3 conjuntos de Mario Beni (RA / OE / AO) com seus subsistemas explícitos (Ecológico, Social, Econômico, Cultural; Superestrutura, Infraestrutura; Mercado, Oferta, Demanda, Distribuição). Quando o diagnóstico tem MST ativo, um anel externo mostra as 4 dimensões adicionais (Tecnologia, Inclusão, TBC, Sensibilização). O Score Final SISTUR aparece no centro da mandala como média dos pilares.',
    category: 'general',
  },

  // Relatórios IA — pipeline, providers e observabilidade (v1.38.x)
  {
    question: 'Qual modelo de IA gera os relatórios do SISTUR?',
    answer: 'A geração usa três provedores em ordem de prioridade: (1) Claude Sonnet 4.5 (Anthropic) como padrão, escolhido pela qualidade narrativa e respeito rigoroso a fontes; (2) GPT-5 (OpenAI) como fallback primário; (3) Gemini 2.5 Pro (Google) como fallback final. Se o provider escolhido falhar (timeout, abort, conteúdo vazio mid-stream), o pipeline cai automaticamente para o próximo, mantendo o mesmo prompt e os mesmos dados auditados. Administradores podem ver o modelo usado em cada relatório do histórico através do badge ao lado do título.',
    category: 'erp',
  },
  {
    question: 'Por que a geração de relatório agora roda em segundo plano?',
    answer: 'Relatórios completos (template "Completo" com 100+ indicadores) levam de 2 a 7 minutos só na fase de inferência da IA. Para evitar que a aba do navegador fique presa esperando a resposta — e que timeouts intermediários do proxy interrompam a geração — o SISTUR enfileira o pedido em report_jobs e dispara um worker dedicado (process-report-job) por trigger de banco. Você pode fechar a aba ou navegar livremente: quando o relatório ficar pronto, o sistema dispara um toast e uma notificação do navegador (se permitida). O histórico mostra o relatório recém-criado automaticamente.',
    category: 'erp',
  },
  {
    question: 'O que é a "pré-visualização ao vivo" do relatório?',
    answer: 'Enquanto a IA escreve o relatório completo (pipeline em 2 fases), o conteúdo aparece progressivamente no card de geração à medida que cada subseção fica pronta: primeiro o pilar RA, depois OE, depois AO, e por fim o envelope (introdução, ficha técnica, alertas IGMA, banco de ações, fontes, considerações finais). Uma barra de progresso e um badge "Pré-visualização ao vivo" ficam visíveis durante todo o processo. Isso elimina a sensação de "spinner sem fim" — você consegue começar a ler enquanto o resto ainda está sendo gerado. PDF e DOCX continuam disponíveis apenas após a persistência do relatório final (não exporta versões inacabadas).',
    category: 'erp',
  },
  {
    question: 'Como funciona a validação cruzada do relatório?',
    answer: 'Todo relatório passa por duas etapas obrigatórias antes de ser persistido: (1) Auto-correção determinística — o pipeline compara cada número citado pelo texto contra a tabela canônica de assessment_indicator_audit; divergências acima de 5% são corrigidas automaticamente. (2) Validação por agente IA (gemini-2.5-pro) que relê o texto pós-correção e produz um relatório de validação salvo em report_validations. O resultado aparece como um banner no topo do relatório (limpo, com avisos ou auto-corrigido). Esta é a política Zero Alucinação: nenhum número, ano ou fonte pode ser inventado pela IA.',
    category: 'erp',
  },
  {
    question: 'Onde acompanho problemas na geração de relatórios?',
    answer: 'Administradores têm acesso ao painel "Logs do Gerador de Relatórios" em /admin/report-logs (botão na página de Logs de Auditoria). Mostra eventos e erros da edge function generate-report agrupados por provider (Claude / GPT-5 / Gemini), com filtros por nível, busca livre, dialog de detalhes (metadata + duração + job/report id) e auto-refresh a cada 15s. Quando o filtro é Claude (default) ou Todos, aparece também um bloco "Pipeline Claude — Tempo Real" que agrupa eventos por trace_id e mapeia para 4 fases visíveis: Pilares (RA·OE·AO), Envelope, Validação e Persistência — útil para detectar stalls de stream.',
    category: 'erp',
  },

  // Troubleshooting geral
  {
    question: 'O sistema fica em "Carregando..." e não abre as páginas. O que faço?',
    answer: 'Após login, o sistema valida sessão, perfil, papéis e licença antes de permitir acesso às páginas. Se ficar travado por mais de ~10 segundos, tente: (1) Hard refresh (Ctrl+Shift+R no Windows/Linux ou Cmd+Shift+R no macOS) para forçar recarregamento sem cache; (2) Limpar cookies/cache do domínio sistur.app e fazer login novamente; (3) Verificar sua conexão com a internet (relatórios e diagnósticos exigem chamadas ao backend). A v1.38.67 corrigiu um caso específico em que o estado de sessão deslogada não inicializava corretamente, prendendo os route guards no spinner. Se o problema persistir após o refresh, contate o suporte informando a rota e o horário.',
    category: 'general',
  },
];

export default function FAQ() {
  const { hasERPAccess, hasEDUAccess, isAdmin } = useProfile();

  // Filter items based on user access
  const getFilteredItems = (category: 'general' | 'edu' | 'erp' | 'enterprise' | 'all') => {
    if (category === 'all') {
      // Show all items the user has access to
      return faqItems.filter(item => {
        if (item.category === 'general') return true;
        if (item.category === 'edu' && (hasEDUAccess || isAdmin)) return true;
        if (item.category === 'erp' && (hasERPAccess || isAdmin)) return true;
        if (item.category === 'enterprise' && isAdmin) return true;
        return false;
      });
    }
    return faqItems.filter(item => item.category === category);
  };

  const generalItems = getFilteredItems('general');
  const eduItems = getFilteredItems('edu');
  const erpItems = getFilteredItems('erp');
  const enterpriseItems = getFilteredItems('enterprise');

  // Determine which tabs to show
  const showERPTab = hasERPAccess || isAdmin;
  const showEDUTab = hasEDUAccess || isAdmin;
  const showEnterpriseTab = isAdmin;
  const defaultTab = showERPTab ? 'erp' : 'edu';

  const renderFAQList = (items: FAQItem[]) => (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger className="text-left">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  const tabCount = [showEDUTab, showERPTab, showEnterpriseTab].filter(Boolean).length;

  return (
    <AppLayout
      title="Perguntas Frequentes"
      subtitle="Tire suas dúvidas sobre o SISTUR"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* General Questions - Always visible */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              Sobre o SISTUR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderFAQList(generalItems)}
          </CardContent>
        </Card>

        {/* System-specific questions with tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              Perguntas por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className={`grid w-full mb-4 ${tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {showEDUTab && (
                  <TabsTrigger value="edu" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span className="hidden sm:inline">SISTUR</span> EDU
                    <Badge variant="secondary" className="ml-1">{eduItems.length}</Badge>
                  </TabsTrigger>
                )}
                {showERPTab && (
                  <TabsTrigger value="erp" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">SISTUR</span> ERP
                    <Badge variant="secondary" className="ml-1">{erpItems.length}</Badge>
                  </TabsTrigger>
                )}
                {showEnterpriseTab && (
                  <TabsTrigger value="enterprise" className="flex items-center gap-2">
                    <Hotel className="h-4 w-4" />
                    Enterprise
                    <Badge variant="secondary" className="ml-1">{enterpriseItems.length}</Badge>
                  </TabsTrigger>
                )}
              </TabsList>
              
              {showEDUTab && (
                <TabsContent value="edu">
                  {eduItems.length > 0 ? (
                    renderFAQList(eduItems)
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma pergunta disponível para este módulo.
                    </p>
                  )}
                </TabsContent>
              )}
              
              {showERPTab && (
                <TabsContent value="erp">
                  {erpItems.length > 0 ? (
                    renderFAQList(erpItems)
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma pergunta disponível para este módulo.
                    </p>
                  )}
                </TabsContent>
              )}

              {showEnterpriseTab && (
                <TabsContent value="enterprise">
                  {enterpriseItems.length > 0 ? (
                    renderFAQList(enterpriseItems)
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma pergunta disponível para este módulo.
                    </p>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
