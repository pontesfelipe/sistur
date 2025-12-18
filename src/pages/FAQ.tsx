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
    answer: 'O SISTUR é um Sistema de Inteligência Territorial para o Turismo que transforma indicadores públicos em decisões estratégicas e capacitação aplicada, fechando o ciclo entre diagnóstico, ação e resultado.',
  },
  {
    question: 'O que são os três pilares (RA, OE, AO)?',
    answer: 'Os três pilares do SISTUR são: RA (Relações Ambientais) - aspectos ambientais e sustentabilidade; OE (Organização Estrutural) - infraestrutura e organização do destino; AO (Ações Operacionais) - operações e serviços turísticos.',
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
    answer: 'O diagnóstico coleta valores de indicadores que são normalizados em uma escala de 0 a 1. Cada indicador recebe um status automático (Adequado, Atenção ou Crítico) baseado no score normalizado. O sistema então identifica problemas e prescreve capacitações específicas.',
  },
  {
    question: 'O que é a interpretação territorial?',
    answer: 'A interpretação territorial classifica os problemas identificados em três categorias: Estrutural (limitações históricas/socioeconômicas), Gestão (falhas de planejamento/coordenação) ou Entrega (falhas na execução de serviços).',
  },
  {
    question: 'Como são geradas as prescrições de cursos?',
    answer: 'As prescrições são geradas automaticamente quando um indicador apresenta status Atenção ou Crítico. O curso prescrito deve corresponder ao pilar do indicador e à interpretação territorial identificada.',
  },
  {
    question: 'O que significa cada status?',
    answer: 'Adequado (verde): score ≥ 0.67, indica bom desempenho. Atenção (amarelo): score entre 0.34 e 0.66, requer monitoramento. Crítico (vermelho): score ≤ 0.33, requer ação imediata.',
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
