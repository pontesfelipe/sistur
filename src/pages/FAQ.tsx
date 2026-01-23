import { AppLayout } from '@/components/layout/AppLayout';
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

const faqItems: FAQItem[] = [
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
    answer: 'O sistema busca automaticamente dados de bases públicas nacionais (IBGE, DATASUS, INEP, Tesouro Nacional, CADASTUR) usando o código IBGE do município. Todos os dados são exibidos com fonte, ano e nível de confiança, e DEVEM ser validados pelo usuário antes do cálculo.',
    category: 'erp',
  },
  {
    question: 'Por que preciso validar os dados pré-preenchidos?',
    answer: 'A validação humana é obrigatória para garantir legitimidade institucional e evitar questionamentos políticos. Nenhum dado automático é "verdade absoluta". O diagnóstico só é calculado após o usuário confirmar ou ajustar cada valor.',
    category: 'erp',
  },
  {
    question: 'Quais são as fontes de dados oficiais?',
    answer: 'O SISTUR utiliza dados de: IBGE (dados demográficos e econômicos), DATASUS (saúde), INEP (educação), STN/Tesouro Nacional (gestão fiscal) e CADASTUR (oferta turística). O código IBGE do município é a chave de integração.',
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
