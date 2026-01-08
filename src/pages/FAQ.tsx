import { AppLayout } from '@/components/layout/AppLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircleQuestion } from 'lucide-react';

const faqItems = [
  {
    question: 'O que é o SISTUR?',
    answer: 'O SISTUR é um Sistema de Inteligência Territorial para o Turismo que transforma indicadores públicos em decisões estratégicas e capacitação aplicada, fechando o ciclo entre diagnóstico, ação e resultado. O sistema é baseado nos princípios sistêmicos de Mario Beni.',
  },
  {
    question: 'O que são os três pilares (RA, OE, AO)?',
    answer: 'Os três pilares do SISTUR são: RA (Relações Ambientais) - aspectos ambientais e sustentabilidade, é o pilar prioritário; OE (Organização Estrutural) - infraestrutura e organização do destino; AO (Ações Operacionais) - operações, serviços turísticos e governança central do sistema.',
  },
  {
    question: 'O que é o Motor IGMA (Mario Beni)?',
    answer: 'O Motor IGMA é o núcleo inteligente do SISTUR que aplica 6 regras sistêmicas baseadas na teoria de Mario Beni: (1) Prioridade RA - limitações ambientais bloqueiam expansão estrutural; (2) Ciclo contínuo - revisões programadas por severidade; (3) Externalidades negativas - alerta quando OE melhora mas RA piora; (4) Governança central - AO crítico bloqueia todo o sistema; (5) Marketing bloqueado se RA ou AO críticos; (6) Interdependência setorial identificada.',
  },
  {
    question: 'Por que RA tem prioridade sobre os outros pilares?',
    answer: 'Segundo Mario Beni, as Relações Ambientais (RA) são a base do sistema turístico. Se o ambiente está degradado, não adianta investir em infraestrutura (OE). Por isso, quando RA está crítico, o sistema bloqueia capacitações de OE até que as questões ambientais sejam resolvidas.',
  },
  {
    question: 'O que significa "Marketing Bloqueado"?',
    answer: 'O sistema bloqueia ações de marketing/promoção turística quando RA (ambiente) ou AO (operações) estão críticos. Promover um destino com problemas ambientais graves ou falhas operacionais sérias pode gerar externalidades negativas e danos à reputação.',
  },
  {
    question: 'Como funciona o pré-preenchimento de dados oficiais?',
    answer: 'O sistema busca automaticamente dados de bases públicas nacionais (IBGE, DATASUS, INEP, Tesouro Nacional, CADASTUR) usando o código IBGE do município. Todos os dados são exibidos com fonte, ano e nível de confiança, e DEVEM ser validados pelo usuário antes do cálculo.',
  },
  {
    question: 'Por que preciso validar os dados pré-preenchidos?',
    answer: 'A validação humana é obrigatória para garantir legitimidade institucional e evitar questionamentos políticos. Nenhum dado automático é "verdade absoluta". O diagnóstico só é calculado após o usuário confirmar ou ajustar cada valor.',
  },
  {
    question: 'Quais são as fontes de dados oficiais?',
    answer: 'O SISTUR utiliza dados de: IBGE (dados demográficos e econômicos), DATASUS (saúde), INEP (educação), STN/Tesouro Nacional (gestão fiscal) e CADASTUR (oferta turística). O código IBGE do município é a chave de integração.',
  },
  {
    question: 'Como funciona o diagnóstico?',
    answer: 'O diagnóstico coleta valores de indicadores que são normalizados em uma escala de 0 a 1. O Motor IGMA aplica as 6 regras de Mario Beni, gerando alertas sistêmicos, bloqueios e a data de próxima revisão recomendada. Cada indicador recebe um status automático (Adequado, Atenção ou Crítico).',
  },
  {
    question: 'O que é a interpretação territorial?',
    answer: 'A interpretação territorial classifica os problemas identificados em três categorias: Estrutural (limitações históricas/socioeconômicas), Gestão (falhas de planejamento/coordenação) ou Entrega (falhas na execução de serviços).',
  },
  {
    question: 'Como são geradas as prescrições de cursos?',
    answer: 'As prescrições são geradas automaticamente quando um indicador apresenta status Atenção ou Crítico. O Motor IGMA pode bloquear certas prescrições (ex: cursos de OE quando RA está crítico). O curso prescrito deve corresponder ao pilar do indicador e à interpretação territorial identificada.',
  },
  {
    question: 'O que significa cada status?',
    answer: 'Adequado (verde): score ≥ 0.67, indica bom desempenho. Atenção (amarelo): score entre 0.34 e 0.66, requer monitoramento. Crítico (vermelho): score ≤ 0.33, requer ação imediata e pode ativar bloqueios IGMA.',
  },
  {
    question: 'Quando é recomendada a próxima revisão?',
    answer: 'O Motor IGMA calcula automaticamente a data de próxima revisão baseado na severidade: pilares críticos = 6 meses, pilares em atenção = 12 meses, todos adequados = 18 meses. Esta data aparece nos alertas do diagnóstico.',
  },
  {
    question: 'O que são externalidades negativas no turismo?',
    answer: 'Externalidades negativas ocorrem quando o crescimento estrutural (OE) acontece às custas do ambiente (RA). O sistema detecta isso quando OE melhora entre ciclos mas RA piora, gerando um alerta específico de externalidade.',
  },
  {
    question: 'Como funciona o monitoramento de ciclos?',
    answer: 'O sistema acompanha a evolução dos indicadores entre ciclos de avaliação, identificando se houve Evolução (melhora), Estagnação (sem mudança) ou Regressão (piora). Alertas são gerados quando há regressão por 2 ou mais ciclos consecutivos.',
  },
  {
    question: 'Quem são os agentes-alvo dos cursos?',
    answer: 'Os cursos são direcionados a três perfis: Gestores Públicos (responsáveis por políticas), Técnicos (profissionais de planejamento) e Trade Turístico (empresários e operadores do setor).',
  },
  {
    question: 'O que acontece com os dados após a validação?',
    answer: 'Após a validação, os dados são "congelados" em um snapshot (diagnosis_data_snapshots) que preserva exatamente os valores usados em cada diagnóstico. O histórico nunca é sobrescrito, garantindo rastreabilidade completa.',
  },
  {
    question: 'O que significa "Dependência Intersetorial"?',
    answer: 'Alguns indicadores dependem de ações de múltiplos setores (saúde, educação, meio ambiente, etc.). O sistema identifica esses indicadores e sinaliza que a melhoria requer articulação intersetorial, não apenas ações isoladas do turismo.',
  },
];

export default function FAQ() {
  return (
    <AppLayout
      title="Perguntas Frequentes"
      subtitle="Tire suas dúvidas sobre o SISTUR"
    >
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              FAQ - Perguntas Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
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
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
