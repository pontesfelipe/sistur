// Leituras do Mapeamento de Infraestrutura do Destino (diagnóstico territorial).
// Usa somente dados oficiais já ingeridos no SISTUR. Nunca fala em concorrência ou diária.
export interface TerritorialInfraInput {
  mapaCategoria?: string | null;      // Mapa do Turismo (A–E) ou null se fora do mapa
  hospedagens?: number | null;        // CADASTUR meios de hospedagem
  leitosTuristicos?: number | null;   // CADASTUR leitos (OE001)
  guias?: number | null;              // CADASTUR guias
  agencias?: number | null;           // CADASTUR agências
  patrimonioIphan: number;            // bens protegidos
  hasAirport: boolean;                // ANAC
  coberturaSaude?: number | null;     // % cobertura atenção básica
  populacao?: number | null;
  nextEvent?: { name: string; start_date: string; estimated_attendance?: number | null } | null;
}
export interface InfraInsight { id: string; title: string; text: string }

export function buildTerritorialInfraInsights(i: TerritorialInfraInput): InfraInsight[] {
  const out: InfraInsight[] = [];
  if (!i.mapaCategoria)
    out.push({ id: 'ti-fora-mapa', title: 'Município fora do Mapa do Turismo', text: 'O município não aparece no Mapa do Turismo Brasileiro. Aderir ao programa (com órgão e conselho municipal de turismo ativos) dá acesso a recursos e programas federais.' });
  if (i.hospedagens == null)
    out.push({ id: 'ti-sem-cadastur', title: 'Oferta turística sem registro no CADASTUR', text: 'Não há registros de hospedagens, guias ou agências no CADASTUR para o município. Uma campanha de formalização com o trade local torna a oferta visível e habilita acesso a crédito e programas do MTur.' });
  else if (i.hospedagens <= 2 && i.patrimonioIphan >= 1)
    out.push({ id: 'ti-patrimonio-sem-hospedagem', title: 'Patrimônio reconhecido com pouca hospedagem formal', text: `Há ${i.patrimonioIphan} bem(ns) protegido(s) pelo IPHAN e só ${i.hospedagens} meio(s) de hospedagem no CADASTUR. O visitante tende a não pernoitar; vale atrair investimento ou formalizar hospedagens familiares.` });
  if (i.hospedagens != null && i.guias === 0 && (i.patrimonioIphan >= 1 || i.mapaCategoria))
    out.push({ id: 'ti-sem-guias', title: 'Sem guias de turismo cadastrados', text: 'Não há guias registrados no CADASTUR. Qualificar e cadastrar guias locais melhora a experiência e a segurança nos atrativos.' });
  if (i.coberturaSaude != null && i.coberturaSaude < 50)
    out.push({ id: 'ti-saude', title: 'Baixa cobertura de saúde', text: `A cobertura de atenção básica é de ${Math.round(i.coberturaSaude)}%. Isso afeta morador e visitante; articule atendimento de referência e divulgue contatos de emergência.` });
  if (i.nextEvent)
    out.push({ id: 'ti-evento', title: 'Evento próximo no destino', text: `"${i.nextEvent.name}" começa em ${new Date(i.nextEvent.start_date).toLocaleDateString('pt-BR')}${i.nextEvent.estimated_attendance ? `, com público estimado de ${i.nextEvent.estimated_attendance.toLocaleString('pt-BR')} pessoas` : ''}. Prepare informação turística, limpeza e trânsito com antecedência.` });
  return out;
}
