const MAP: { prefix: string; items: string[] }[] = [
  { prefix: '/diagnosticos', items: ['Como criar uma nova rodada de diagnóstico?', 'Como recalcular um diagnóstico?', 'Por que aparece a tarja de diagnóstico desatualizado?'] },
  { prefix: '/projetos', items: ['Como criar um projeto a partir do diagnóstico?', 'Como exportar tarefas para CSV ou calendário?', 'Como adicionar membros ao projeto?'] },
  { prefix: '/relatorios', items: ['Como gerar um relatório?', 'Onde vejo as fontes usadas no relatório?', 'Como baixar o relatório?'] },
  { prefix: '/edu', items: ['Como me inscrever em um curso?', 'Onde vejo meu certificado?', 'Como funcionam as trilhas?'] },
  { prefix: '/cursos', items: ['Como me inscrever em um curso?', 'Onde vejo meu certificado?', 'Como funcionam as provas?'] },
  { prefix: '/assinatura', items: ['Quais são os planos disponíveis?', 'Como funciona o período de teste?', 'Como cancelar minha assinatura?'] },
  { prefix: '/precos', items: ['Quais são os planos disponíveis?', 'Como funciona o desconto anual?', 'Como funciona o período de teste?'] },
  { prefix: '/destinos', items: ['Como cadastrar um destino?', 'Como os dados oficiais são preenchidos?', 'Como editar um destino?'] },
];
const DEFAULT = ['Por onde começo no SISTUR?', 'Por que não consigo acessar um módulo?', 'Onde encontro os tutoriais em vídeo?'];

export function getRouteSuggestions(path: string): string[] {
  return MAP.find(m => path.startsWith(m.prefix))?.items ?? DEFAULT;
}
