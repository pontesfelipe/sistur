import type { BiomeStory } from './types';

export const BIOME_STORIES: Record<string, BiomeStory> = {
  floresta: {
    biomeId: 'floresta',
    biomeName: 'Floresta Amazônica',
    biomeEmoji: '🌳',
    biomeColor: 'hsl(142, 76%, 36%)',
    backgroundGradient: 'from-green-900 via-green-800 to-emerald-900',
    description: 'Uma jornada pela maior floresta tropical do mundo.',
    scenes: [
      {
        id: 'inicio',
        chapter: 1,
        title: 'O Chamado da Floresta',
        narrative: 'Você é um jovem guardião ambiental que acaba de chegar a uma comunidade ribeirinha na Amazônia. A floresta ao redor está ameaçada: madeireiros ilegais avançam, queimadas se aproximam e a comunidade local precisa de ajuda. O líder da comunidade, Seu Raimundo, te recebe com preocupação: "A floresta está pedindo socorro. Precisamos de alguém corajoso para nos ajudar."',
        emoji: '🌿',
        choices: [
          { text: 'Organizar uma patrulha comunitária para monitorar a floresta', effects: { comunidade: 10, biodiversidade: 5 }, nextScene: 'patrulha', feedback: 'A comunidade se une! Juntos, vocês começam a mapear as áreas de risco.', type: 'sustentavel' },
          { text: 'Investigar sozinho as atividades ilegais', effects: { biodiversidade: 5, poluicao: -5 }, nextScene: 'investigacao', feedback: 'Corajoso, mas perigoso. Você encontra evidências importantes, mas se expõe a riscos.', type: 'arriscado' },
          { text: 'Ignorar os avisos e focar em explorar a floresta por diversão', effects: { biodiversidade: -5, comunidade: -10 }, nextScene: 'negligencia', feedback: 'Enquanto você passeia, os madeireiros avançam sem impedimento.', type: 'arriscado' },
        ],
      },
      // Chapter 2 scenes
      {
        id: 'patrulha', chapter: 2, title: 'A Patrulha Verde', emoji: '🔍',
        narrative: 'A patrulha comunitária encontra uma área de desmatamento recente. Árvores centenárias foram derrubadas e o solo está exposto. Animais estão fugindo da região. Um membro da patrulha encontra rastros de máquinas pesadas.',
        choices: [
          { text: 'Documentar tudo e denunciar ao IBAMA', effects: { biodiversidade: 10, poluicao: -8, comunidade: 5 }, nextScene: 'denuncia', feedback: 'A denúncia formal é um passo importante. As autoridades prometem investigar.', type: 'sustentavel' },
          { text: 'Confrontar os madeireiros diretamente', effects: { biodiversidade: 5, comunidade: -5, recursos: -10 }, nextScene: 'confronto', feedback: 'O confronto gera tensão. Os madeireiros recuam temporariamente, mas prometem voltar.', type: 'arriscado' },
          { text: 'Iniciar um replantio emergencial na área devastada', effects: { biodiversidade: 15, comunidade: 8, poluicao: -5 }, nextScene: 'replantio', feedback: 'Mãos na terra! A comunidade planta centenas de mudas nativas.', type: 'sustentavel' },
        ],
      },
      {
        id: 'investigacao', chapter: 2, title: 'Nas Sombras da Floresta', emoji: '🕵️',
        narrative: 'Sua investigação revela uma rede organizada de extração ilegal de madeira. Você encontra um acampamento oculto com equipamentos pesados. De repente, ouve vozes se aproximando.',
        choices: [
          { text: 'Fotografar as evidências e recuar silenciosamente', effects: { biodiversidade: 8, comunidade: 5 }, nextScene: 'denuncia', feedback: 'Suas fotos serão provas cruciais. Você consegue sair sem ser visto.', type: 'sustentavel' },
          { text: 'Sabotar os equipamentos para atrasar a operação', effects: { biodiversidade: 10, poluicao: -10, comunidade: -8 }, nextScene: 'confronto', feedback: 'Os equipamentos são danificados, mas isso pode gerar retaliação.', type: 'arriscado' },
        ],
      },
      {
        id: 'negligencia', chapter: 2, title: 'O Preço da Inação', emoji: '💀',
        narrative: 'Enquanto você explorava sem rumo, uma grande área foi desmatada durante a noite. Seu Raimundo está furioso: "Você prometeu ajudar e nada fez! Agora perdemos árvores de 200 anos." A comunidade perde a confiança em você.',
        choices: [
          { text: 'Pedir desculpas e tentar organizar uma resposta tardia', effects: { comunidade: 5, biodiversidade: -5 }, nextScene: 'resposta_tardia', feedback: 'Tarde demais para impedir o estrago, mas talvez haja tempo para minimizar.', type: 'neutro' },
          { text: 'Culpar a comunidade por não ter agido sozinha', effects: { comunidade: -20, biodiversidade: -10 }, nextScene: 'falha_floresta', feedback: 'Sua arrogância destruiu a última chance de cooperação.', type: 'arriscado' },
        ],
      },
      {
        id: 'resposta_tardia', chapter: 3, title: 'Correndo Atrás do Prejuízo', emoji: '🏃',
        narrative: 'Você tenta montar uma patrulha, mas a comunidade desconfia. Poucos se voluntariam. Enquanto isso, os madeireiros expandem suas operações para uma área de nascentes.',
        choices: [
          { text: 'Buscar apoio externo de ONGs ambientais', effects: { biodiversidade: 8, comunidade: 5, recursos: 5 }, nextScene: 'ong_apoio', feedback: 'Uma ONG envia voluntários e equipamentos. Ainda há esperança.', type: 'sustentavel' },
          { text: 'Desistir e ir embora', effects: { biodiversidade: -15, comunidade: -15 }, nextScene: 'falha_floresta', feedback: 'Sem você, a floresta fica sem defesa. Os madeireiros avançam sem parar.', type: 'arriscado' },
        ],
      },
      // Chapter 3 scenes
      {
        id: 'denuncia', chapter: 3, title: 'Justiça na Floresta', emoji: '⚖️',
        narrative: 'A denúncia surtiu efeito! Uma operação do IBAMA é realizada e os madeireiros são presos. Mas a floresta ainda precisa se recuperar. A área desmatada é grande e os animais perderam seu habitat.',
        choices: [
          { text: 'Liderar um grande projeto de reflorestamento com espécies nativas', effects: { biodiversidade: 15, poluicao: -10, comunidade: 10 }, nextScene: 'reflorestamento', feedback: 'Milhares de mudas são plantadas. Corredores ecológicos são restaurados.', type: 'sustentavel' },
          { text: 'Criar um programa de educação ambiental para toda a região', effects: { comunidade: 15, biodiversidade: 8, recursos: 5 }, nextScene: 'educacao', feedback: 'Conhecimento é a melhor proteção para as futuras gerações.', type: 'sustentavel' },
          { text: 'Vender a madeira apreendida para financiar outras ações', effects: { recursos: 15, biodiversidade: -10, poluicao: 5 }, nextScene: 'corrupcao', feedback: 'A decisão controversa gera conflito e levanta questões éticas.', type: 'arriscado' },
        ],
      },
      {
        id: 'confronto', chapter: 3, title: 'Consequências', emoji: '⚡',
        narrative: 'O confronto trouxe atenção da mídia, mas também dividiu a comunidade. Os madeireiros voltaram com mais força e proteção política.',
        choices: [
          { text: 'Buscar apoio de ONGs e organizações internacionais', effects: { biodiversidade: 10, comunidade: 8, recursos: 10 }, nextScene: 'ong_apoio', feedback: 'A pressão internacional força as autoridades a agirem.', type: 'sustentavel' },
          { text: 'Aceitar um acordo com os madeireiros para exploração parcial', effects: { recursos: 10, biodiversidade: -15, poluicao: 10 }, nextScene: 'acordo_madeireiros', feedback: 'O compromisso traz paz temporária, mas a floresta encolhe.', type: 'arriscado' },
        ],
      },
      {
        id: 'replantio', chapter: 3, title: 'Sementes de Esperança', emoji: '🌱',
        narrative: 'O replantio é um sucesso! Meses depois, as mudas começam a crescer. Pássaros voltam a cantar. Um pesquisador da universidade propõe uma parceria.',
        choices: [
          { text: 'Aceitar a parceria para monitoramento científico', effects: { biodiversidade: 12, comunidade: 10, recursos: 8 }, nextScene: 'ciencia', feedback: 'Ciência e comunidade juntas! O projeto vira referência.', type: 'sustentavel' },
          { text: 'Expandir para criar um viveiro comunitário de mudas', effects: { biodiversidade: 10, comunidade: 12, recursos: 10 }, nextScene: 'viveiro', feedback: 'O viveiro gera renda e restaura a floresta.', type: 'sustentavel' },
        ],
      },
      // Chapter 4 scenes
      {
        id: 'reflorestamento', chapter: 4, title: 'Floresta Renascendo', emoji: '🌲',
        narrative: 'O projeto de reflorestamento cresce. Hectares são recuperados, animais retornam e a comunidade se orgulha. Mas surge um novo desafio: garimpeiros ilegais descobrem ouro na região.',
        choices: [
          { text: 'Mobilizar a comunidade e as autoridades contra o garimpo', effects: { biodiversidade: 15, comunidade: 12, poluicao: -10 }, nextScene: 'final_restaurado', feedback: 'A resistência é forte! O garimpo é impedido e a floresta protegida para sempre.', type: 'sustentavel' },
          { text: 'Permitir garimpo controlado para gerar renda', effects: { recursos: 15, biodiversidade: -20, poluicao: 15 }, nextScene: 'final_degradado', feedback: 'O mercúrio envenena os rios. O reflorestamento é destruído pelo garimpo.', type: 'arriscado' },
        ],
      },
      {
        id: 'educacao', chapter: 4, title: 'Gerações Guardiãs', emoji: '📚',
        narrative: 'O programa educacional forma centenas de jovens guardiões. Escolas adotam currículos ambientais. Mas empresas de agronegócio pressionam políticos para enfraquecer leis de proteção.',
        choices: [
          { text: 'Organizar uma campanha nacional de conscientização', effects: { comunidade: 15, biodiversidade: 10 }, nextScene: 'final_restaurado', feedback: 'A voz da floresta ecoa em todo o Brasil! As leis são mantidas.', type: 'sustentavel' },
          { text: 'Ignorar a pressão política e focar apenas na educação local', effects: { comunidade: 5, biodiversidade: -5 }, nextScene: 'final_neutro', feedback: 'O trabalho local é bom, mas sem proteção legal a floresta continua ameaçada.', type: 'neutro' },
        ],
      },
      {
        id: 'corrupcao', chapter: 4, title: 'Caminho Sombrio', emoji: '💰',
        narrative: 'A venda da madeira apreendida criou um precedente perigoso. Agora outros querem "apreender" madeira para vendê-la. A corrupção se espalha e a comunidade perde a fé.',
        choices: [
          { text: 'Denunciar o esquema e assumir a responsabilidade pelo erro', effects: { comunidade: 10, biodiversidade: 5, recursos: -10 }, nextScene: 'final_neutro', feedback: 'A honestidade tardia salva parte da reputação, mas o dano foi grande.', type: 'neutro' },
          { text: 'Continuar lucrando com o esquema', effects: { recursos: 10, biodiversidade: -20, comunidade: -20 }, nextScene: 'falha_floresta', feedback: 'A ganância destruiu tudo. Você se tornou parte do problema.', type: 'arriscado' },
        ],
      },
      {
        id: 'ong_apoio', chapter: 4, title: 'Aliança pela Floresta', emoji: '🤝',
        narrative: 'A ONG traz recursos, visibilidade e apoio jurídico. A comunidade ganha força e os madeireiros são encurralados legalmente. Mas falta um passo crucial: garantir proteção permanente.',
        choices: [
          { text: 'Criar uma Reserva Extrativista com proteção federal', effects: { biodiversidade: 18, comunidade: 15, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'A Reserva é criada! Proteção permanente para a floresta e a comunidade.', type: 'sustentavel' },
          { text: 'Apostar apenas na vigilância voluntária sem proteção legal', effects: { biodiversidade: 5, comunidade: 5 }, nextScene: 'final_neutro', feedback: 'Sem lei, a proteção depende de vontade. E vontade pode enfraquecer.', type: 'neutro' },
        ],
      },
      {
        id: 'acordo_madeireiros', chapter: 4, title: 'Acordo Perigoso', emoji: '📝',
        narrative: 'O acordo parecia razoável, mas os madeireiros não cumprem. A "exploração parcial" se torna total. A floresta desaparece rapidamente.',
        choices: [
          { text: 'Romper o acordo e denunciar as violações', effects: { biodiversidade: 8, comunidade: 5 }, nextScene: 'final_neutro', feedback: 'Tarde, mas melhor que nunca. A denúncia para a destruição, mas o estrago é grande.', type: 'neutro' },
          { text: 'Aceitar a situação como irreversível', effects: { biodiversidade: -15, comunidade: -10 }, nextScene: 'final_degradado', feedback: 'A rendição seló o destino da floresta. Sem luta, não há esperança.', type: 'arriscado' },
        ],
      },
      {
        id: 'ciencia', chapter: 4, title: 'Floresta Inteligente', emoji: '🔬',
        narrative: 'O monitoramento científico revela que a restauração está funcionando. Espécies raras retornam. Mas um incêndio criminoso ameaça destruir todo o trabalho.',
        choices: [
          { text: 'Ativar brigadistas e satélites para combater o fogo', effects: { biodiversidade: 15, comunidade: 10, poluicao: -10 }, nextScene: 'final_restaurado', feedback: 'O fogo é contido! A tecnologia e a comunidade salvam a floresta restaurada.', type: 'sustentavel' },
          { text: 'Evacuar a área e aceitar a perda', effects: { biodiversidade: -10, comunidade: -5 }, nextScene: 'final_neutro', feedback: 'A área queima, mas as pessoas são salvas. Será preciso recomeçar.', type: 'neutro' },
        ],
      },
      {
        id: 'viveiro', chapter: 4, title: 'Mudas para o Futuro', emoji: '🌿',
        narrative: 'O viveiro produz milhares de mudas e emprega dezenas de famílias. Outras comunidades querem replicar o modelo. Mas há pressão para converter o viveiro em plantação de soja.',
        choices: [
          { text: 'Resistir e expandir o viveiro para toda a região', effects: { biodiversidade: 15, comunidade: 15, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'A rede de viveiros transforma a Amazônia! Restauração ecológica vira negócio.', type: 'sustentavel' },
          { text: 'Converter metade para soja como compromisso econômico', effects: { recursos: 10, biodiversidade: -10, poluicao: 8 }, nextScene: 'final_neutro', feedback: 'O compromisso salva empregos, mas reduz o impacto ambiental pela metade.', type: 'neutro' },
        ],
      },
      // Chapter 5 endings
      {
        id: 'final_restaurado', chapter: 5, title: '🏆 Floresta Restaurada!', emoji: '🌟',
        narrative: 'Seu trabalho transformou a região! A floresta se recupera, a biodiversidade retorna, e a comunidade vive em harmonia com o meio ambiente. Você se tornou uma referência em conservação ambiental. A floresta amazônica, patrimônio da humanidade, tem um futuro mais esperançoso graças às suas escolhas.',
        choices: [], isEnding: true, endingType: 'restaurado',
      },
      {
        id: 'final_degradado', chapter: 5, title: '💔 Floresta em Perigo', emoji: '😔',
        narrative: 'Apesar dos esforços, as concessões feitas permitiram que a degradação continuasse. A floresta encolheu, espécies foram perdidas e a comunidade enfrenta as consequências das mudanças climáticas locais. Ainda há esperança, mas o caminho será muito mais longo e difícil.',
        choices: [], isEnding: true, endingType: 'degradado',
      },
      {
        id: 'final_neutro', chapter: 5, title: '⚖️ Equilíbrio Frágil', emoji: '🤔',
        narrative: 'A situação melhorou em alguns aspectos, mas desafios persistem. A floresta não foi completamente restaurada, mas também não foi destruída. É um equilíbrio delicado que exige vigilância constante.',
        choices: [], isEnding: true, endingType: 'neutro',
      },
      {
        id: 'falha_floresta', chapter: 5, title: '🔥 Missão Fracassada', emoji: '💀',
        narrative: 'Suas escolhas levaram ao pior cenário possível. A floresta foi devastada, a comunidade se dispersou e a biodiversidade foi perdida de forma irreversível. Os rios secaram, o clima mudou e o que era paraíso virou deserto verde. Esta é uma lição dolorosa: cada decisão importa, e a inação é a pior das ações.',
        choices: [], isEnding: true, endingType: 'degradado',
      },
    ],
  },

  praia: {
    biomeId: 'praia',
    biomeName: 'Litoral Tropical',
    biomeEmoji: '🏖️',
    biomeColor: 'hsl(199, 89%, 48%)',
    backgroundGradient: 'from-cyan-900 via-blue-800 to-sky-900',
    description: 'Proteja os ecossistemas costeiros do Brasil.',
    scenes: [
      {
        id: 'inicio', chapter: 1, title: 'Marés de Mudança', emoji: '🌊',
        narrative: 'Você chega a uma vila de pescadores no litoral nordestino. A praia que antes era paradisíaca agora sofre com lixo nas areias, esgoto despejado no mar e recifes de coral morrendo. O turismo desordenado tomou conta e os pescadores tradicionais mal conseguem pescar.',
        choices: [
          { text: 'Organizar um mutirão de limpeza da praia', effects: { poluicao: -15, comunidade: 10, biodiversidade: 5 }, nextScene: 'limpeza', feedback: 'Toneladas de lixo são recolhidas! A praia começa a voltar a brilhar.', type: 'sustentavel' },
          { text: 'Investigar a origem do esgoto ilegal', effects: { poluicao: -10, biodiversidade: 8 }, nextScene: 'esgoto', feedback: 'Você descobre que hotéis despejam esgoto sem tratamento direto no mar.', type: 'sustentavel' },
          { text: 'Aproveitar o turismo e abrir um bar na praia', effects: { recursos: 10, poluicao: 10, biodiversidade: -8 }, nextScene: 'bar_praia', feedback: 'Mais um negócio que gera lixo. Os pescadores te olham com desprezo.', type: 'arriscado' },
        ],
      },
      // Chapter 2
      {
        id: 'limpeza', chapter: 2, title: 'Praia Limpa, Coração Cheio', emoji: '♻️',
        narrative: 'O mutirão foi um sucesso e ganhou destaque na mídia! Mas o lixo continua chegando. A raiz do problema é a falta de coleta seletiva. Um vereador local se aproxima com uma proposta.',
        choices: [
          { text: 'Criar um programa permanente de reciclagem', effects: { poluicao: -15, comunidade: 10, recursos: 10 }, nextScene: 'reciclagem', feedback: 'A reciclagem gera renda e mantém a praia limpa. Solução sustentável!', type: 'sustentavel' },
          { text: 'Aceitar a proposta política que inclui um resort', effects: { recursos: 15, poluicao: 10, biodiversidade: -10 }, nextScene: 'resort', feedback: 'O resort trará empregos, mas a que custo ambiental?', type: 'arriscado' },
        ],
      },
      {
        id: 'esgoto', chapter: 2, title: 'Águas Turvas', emoji: '🔬',
        narrative: 'Sua investigação revela que três grandes hotéis despejam esgoto sem tratamento no oceano. Os recifes de coral estão morrendo e peixes desaparecendo.',
        choices: [
          { text: 'Denunciar publicamente e mobilizar a comunidade', effects: { poluicao: -20, comunidade: 15, biodiversidade: 10 }, nextScene: 'mobilizacao', feedback: 'A pressão pública obriga os hotéis a investir em tratamento!', type: 'sustentavel' },
          { text: 'Negociar diretamente com os hotéis por soluções', effects: { poluicao: -10, recursos: 8 }, nextScene: 'negociacao', feedback: 'Os hotéis concordam com mudanças graduais. Progresso lento.', type: 'neutro' },
        ],
      },
      {
        id: 'bar_praia', chapter: 2, title: 'Lucro e Lixo', emoji: '🍹',
        narrative: 'Seu bar faz sucesso, mas gera mais lixo na praia. Tartarugas marinhas não conseguem mais desovar por causa das luzes e do barulho. Dona Carmem, pescadora de 70 anos, te confronta: "Você veio ajudar ou destruir?"',
        choices: [
          { text: 'Fechar o bar e pedir desculpas à comunidade', effects: { comunidade: 8, recursos: -10, biodiversidade: 5 }, nextScene: 'redencao_praia', feedback: 'A humildade conquista respeito. A comunidade te dá uma segunda chance.', type: 'neutro' },
          { text: 'Expandir o bar e ignorar as críticas', effects: { recursos: 15, biodiversidade: -15, poluicao: 15, comunidade: -15 }, nextScene: 'falha_praia', feedback: 'O litoral se degrada. Você é expulso pela comunidade revoltada.', type: 'arriscado' },
        ],
      },
      // Chapter 3
      {
        id: 'reciclagem', chapter: 3, title: 'Onda Verde', emoji: '🌍',
        narrative: 'O programa de reciclagem transforma a vila! Cooperativas ganham renda, a praia está limpa e turistas conscientes preferem o destino. Mas microplásticos ainda ameaçam o oceano.',
        choices: [
          { text: 'Lançar campanha "Praia Sem Plástico" e banir descartáveis', effects: { poluicao: -15, biodiversidade: 10, comunidade: 10 }, nextScene: 'praia_limpa', feedback: 'A vila se torna referência em sustentabilidade costeira!', type: 'sustentavel' },
          { text: 'Desenvolver filtragem local de microplásticos', effects: { poluicao: -12, biodiversidade: 12, recursos: 8 }, nextScene: 'tecnologia_azul', feedback: 'Inovação local replicada em outras comunidades costeiras!', type: 'sustentavel' },
        ],
      },
      {
        id: 'resort', chapter: 3, title: 'Paraíso Perdido?', emoji: '🏨',
        narrative: 'O resort foi construído, trazendo empregos mas também mais esgoto e privatização da praia. Tartarugas perderam seu local de desova.',
        choices: [
          { text: 'Exigir compensações ambientais e áreas de conservação', effects: { biodiversidade: 8, poluicao: -5, comunidade: 5 }, nextScene: 'compensacao', feedback: 'Compensações ajudam, mas o dano já foi feito.', type: 'neutro' },
          { text: 'Permitir mais resorts na costa', effects: { recursos: 15, biodiversidade: -20, poluicao: 15 }, nextScene: 'falha_praia', feedback: 'A costa é tomada pelo concreto. O paraíso foi perdido para sempre.', type: 'arriscado' },
        ],
      },
      {
        id: 'mobilizacao', chapter: 3, title: 'Maré de Mudança', emoji: '✊',
        narrative: 'A mobilização popular força os hotéis a instalar estações de tratamento. Os recifes começam a se recuperar e os peixes retornam.',
        choices: [
          { text: 'Criar programa de monitoramento dos recifes de coral', effects: { biodiversidade: 15, comunidade: 10, poluicao: -10 }, nextScene: 'recifes', feedback: 'Os recifes florescem! Mergulhadores de todo o mundo vêm admirar.', type: 'sustentavel' },
          { text: 'Transformar pescadores em guias de mergulho', effects: { recursos: 12, comunidade: 12, biodiversidade: 8 }, nextScene: 'guias_mar', feedback: 'Os guardiões do mar agora são embaixadores do oceano!', type: 'sustentavel' },
        ],
      },
      {
        id: 'negociacao', chapter: 3, title: 'Progresso Lento', emoji: '🐢',
        narrative: 'Os hotéis fazem mudanças graduais. O esgoto diminui, mas não para completamente.',
        choices: [
          { text: 'Pressionar por prazos mais agressivos com apoio legal', effects: { poluicao: -10, biodiversidade: 8, comunidade: 5 }, nextScene: 'pressao_legal', feedback: 'A lei obriga ação. Progresso real, mas demorado.', type: 'sustentavel' },
          { text: 'Aceitar o ritmo lento', effects: { poluicao: -3, biodiversidade: -5 }, nextScene: 'final_neutro', feedback: 'A lentidão permite que o dano continue se acumulando.', type: 'neutro' },
        ],
      },
      {
        id: 'redencao_praia', chapter: 3, title: 'Segunda Chance', emoji: '🙏',
        narrative: 'A comunidade aceita sua mudança de atitude. Juntos, vocês criam um projeto de turismo comunitário que respeita o meio ambiente e valoriza a cultura local.',
        choices: [
          { text: 'Criar uma área marinha protegida com pesca artesanal', effects: { biodiversidade: 15, comunidade: 10, recursos: 8 }, nextScene: 'area_marinha', feedback: 'A área protegida permite a recuperação dos estoques pesqueiros!', type: 'sustentavel' },
          { text: 'Organizar festival gastronômico de pescado sustentável', effects: { recursos: 12, comunidade: 12 }, nextScene: 'festival_mar', feedback: 'O festival valoriza a pesca artesanal e atrai turismo responsável.', type: 'sustentavel' },
        ],
      },
      // Chapter 4
      {
        id: 'praia_limpa', chapter: 4, title: 'Oceano Agradece', emoji: '🐬',
        narrative: 'A praia sem plástico atrai turistas do mundo todo. Golfinhos são vistos perto da costa pela primeira vez em décadas. Mas um derramamento de óleo de um navio ameaça destruir tudo.',
        choices: [
          { text: 'Mobilizar uma operação massiva de limpeza do óleo', effects: { biodiversidade: 12, comunidade: 15, poluicao: -10 }, nextScene: 'final_restaurado', feedback: 'A comunidade e voluntários de todo o país salvam a costa!', type: 'sustentavel' },
          { text: 'Esperar que as autoridades resolvam', effects: { biodiversidade: -10, poluicao: 10 }, nextScene: 'final_neutro', feedback: 'As autoridades demoram. Quando chegam, o dano já é grande.', type: 'neutro' },
        ],
      },
      {
        id: 'tecnologia_azul', chapter: 4, title: 'Inovação Oceânica', emoji: '🧪',
        narrative: 'A tecnologia de filtragem ganha prêmio internacional. Universidades querem parceria. O projeto se expande para todo o litoral nordestino.',
        choices: [
          { text: 'Criar um hub de tecnologia oceânica na vila', effects: { recursos: 15, biodiversidade: 12, comunidade: 12 }, nextScene: 'final_restaurado', feedback: 'A vila se torna a capital brasileira da tecnologia azul!', type: 'sustentavel' },
        ],
      },
      {
        id: 'compensacao', chapter: 4, title: 'Remendando Estragos', emoji: '🩹',
        narrative: 'As compensações criam uma área de preservação, mas o resort continua poluindo. Os moradores estão divididos entre emprego e meio ambiente.',
        choices: [
          { text: 'Exigir que o resort adote práticas sustentáveis certificadas', effects: { poluicao: -8, biodiversidade: 5, recursos: 5 }, nextScene: 'final_neutro', feedback: 'Melhorias parciais. O equilíbrio entre turismo e natureza é frágil.', type: 'neutro' },
          { text: 'Fiscalizar rigorosamente e multar violações', effects: { poluicao: -12, biodiversidade: 8 }, nextScene: 'final_restaurado', feedback: 'A fiscalização funciona. O resort se adapta ou fecha.', type: 'sustentavel' },
        ],
      },
      {
        id: 'recifes', chapter: 4, title: 'Jardins do Mar', emoji: '🪸',
        narrative: 'Os recifes restaurados abrigam centenas de espécies. Tartarugas voltam a desovar. O projeto ganha reconhecimento da UNESCO.',
        choices: [
          { text: 'Candidatar a região a Patrimônio Natural da Humanidade', effects: { biodiversidade: 18, comunidade: 12, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'A UNESCO reconhece! Proteção permanente para os recifes!', type: 'sustentavel' },
        ],
      },
      {
        id: 'guias_mar', chapter: 4, title: 'Embaixadores do Oceano', emoji: '🤿',
        narrative: 'Os guias são um sucesso! Mas a demanda crescente de turistas ameaça sobrecarregar os recifes.',
        choices: [
          { text: 'Implementar limite de visitantes e taxa de conservação', effects: { biodiversidade: 12, comunidade: 10, recursos: 8 }, nextScene: 'final_restaurado', feedback: 'Turismo sustentável! A natureza e a comunidade prosperam juntas.', type: 'sustentavel' },
          { text: 'Maximizar visitantes para gerar mais renda', effects: { recursos: 15, biodiversidade: -10 }, nextScene: 'final_neutro', feedback: 'Mais dinheiro, mas os recifes sofrem com o excesso de visitantes.', type: 'arriscado' },
        ],
      },
      {
        id: 'pressao_legal', chapter: 4, title: 'Força da Lei', emoji: '⚖️',
        narrative: 'Os hotéis são obrigados legalmente a tratar o esgoto. Mas um dos donos tenta subornar o fiscal para relaxar as exigências.',
        choices: [
          { text: 'Denunciar a tentativa de suborno', effects: { poluicao: -15, comunidade: 10, biodiversidade: 10 }, nextScene: 'final_restaurado', feedback: 'A justiça prevalece! O hotel é multado e todos cumprem a lei.', type: 'sustentavel' },
          { text: 'Ignorar o suborno', effects: { poluicao: 5, comunidade: -5 }, nextScene: 'final_neutro', feedback: 'A corrupção enfraquece a fiscalização. O progresso é parcial.', type: 'neutro' },
        ],
      },
      {
        id: 'area_marinha', chapter: 4, title: 'Santuário Azul', emoji: '🐢',
        narrative: 'A área marinha protegida é um sucesso. Peixes se multiplicam, tartarugas desovam e a pesca artesanal prospera. Mas navios pesqueiros industriais invadem a área à noite.',
        choices: [
          { text: 'Instalar sistema de monitoramento e patrulha noturna', effects: { biodiversidade: 15, comunidade: 12 }, nextScene: 'final_restaurado', feedback: 'A tecnologia protege o santuário dia e noite!', type: 'sustentavel' },
          { text: 'Deixar para as autoridades resolverem', effects: { biodiversidade: -5 }, nextScene: 'final_neutro', feedback: 'Sem vigilância ativa, os navios continuam invadindo esporadicamente.', type: 'neutro' },
        ],
      },
      {
        id: 'festival_mar', chapter: 4, title: 'Sabores do Mar', emoji: '🎉',
        narrative: 'O festival é um sucesso! Turistas e moradores celebram a culinária local. Restaurantes valorizam o pescado artesanal.',
        choices: [
          { text: 'Criar selo "Pescado Sustentável" para todo o litoral', effects: { recursos: 12, biodiversidade: 10, comunidade: 12 }, nextScene: 'final_restaurado', feedback: 'O selo transforma o mercado! Pesca sustentável vira orgulho regional.', type: 'sustentavel' },
        ],
      },
      // Chapter 5 endings
      { id: 'final_restaurado', chapter: 5, title: '🏆 Litoral Restaurado!', emoji: '🌟', narrative: 'O litoral se transformou! Águas cristalinas, recifes vivos, praias limpas e uma comunidade próspera. Seu trabalho mostrou que é possível conciliar turismo, pesca e conservação. O oceano agradece!', choices: [], isEnding: true, endingType: 'restaurado' },
      { id: 'final_degradado', chapter: 5, title: '💔 Litoral em Perigo', emoji: '😔', narrative: 'O desenvolvimento desordenado cobrou seu preço. Praias poluídas, recifes mortos e pescadores sem peixe. O paraíso foi perdido para o concreto e a negligência.', choices: [], isEnding: true, endingType: 'degradado' },
      { id: 'final_neutro', chapter: 5, title: '⚖️ Maré Indecisa', emoji: '🤔', narrative: 'Algumas melhorias foram conquistadas, mas os problemas estruturais permanecem. O litoral sobrevive entre a beleza natural e a pressão do desenvolvimento.', choices: [], isEnding: true, endingType: 'neutro' },
      { id: 'falha_praia', chapter: 5, title: '🌊 Missão Fracassada', emoji: '💀', narrative: 'O litoral foi destruído. Praias cobertas de lixo, recifes mortos, peixes envenenados. A comunidade pesqueira que vivia ali há gerações foi forçada a abandonar seu lar. Suas escolhas egoístas transformaram o paraíso em pesadelo. O mar não perdoa.', choices: [], isEnding: true, endingType: 'degradado' },
    ],
  },

  cerrado: {
    biomeId: 'cerrado',
    biomeName: 'Cerrado Brasileiro',
    biomeEmoji: '🌾',
    biomeColor: 'hsl(43, 96%, 56%)',
    backgroundGradient: 'from-amber-900 via-yellow-800 to-orange-900',
    description: 'Defenda a savana mais biodiversa do planeta.',
    scenes: [
      {
        id: 'inicio', chapter: 1, title: 'O Coração do Brasil', emoji: '🌻',
        narrative: 'Você chega ao cerrado mineiro, onde o avanço da soja e do gado devora a vegetação nativa. Nascentes estão secando, lobos-guarás perdem habitat e comunidades quilombolas lutam para manter suas terras.',
        choices: [
          { text: 'Visitar uma comunidade quilombola para entender seus desafios', effects: { comunidade: 12, recursos: 5, biodiversidade: 5 }, nextScene: 'quilombo', feedback: 'A sabedoria dos quilombolas sobre o cerrado é ancestral e insubstituível.', type: 'sustentavel' },
          { text: 'Mapear as áreas de nascentes ameaçadas', effects: { biodiversidade: 10, poluicao: -8 }, nextScene: 'nascentes', feedback: 'As nascentes são a vida do cerrado. Protegê-las é proteger tudo.', type: 'sustentavel' },
          { text: 'Aceitar oferta de trabalho em fazenda de soja', effects: { recursos: 15, biodiversidade: -10, poluicao: 10 }, nextScene: 'soja', feedback: 'Dinheiro fácil, mas às custas do cerrado. As máquinas não param.', type: 'arriscado' },
        ],
      },
      // Chapter 2
      {
        id: 'quilombo', chapter: 2, title: 'Terra de Direito', emoji: '🏡',
        narrative: 'Dona Benedita conta que seus ancestrais vivem ali há 200 anos, mas grileiros tentam expulsá-los. "A terra é nossa mãe. Sem ela, perdemos tudo." Eles preservam o cerrado naturalmente.',
        choices: [
          { text: 'Ajudar na regularização fundiária', effects: { comunidade: 15, biodiversidade: 10, recursos: 5 }, nextScene: 'regularizacao', feedback: 'Terras tituladas são terras protegidas!', type: 'sustentavel' },
          { text: 'Documentar o conhecimento tradicional sobre plantas', effects: { comunidade: 10, biodiversidade: 8, recursos: 8 }, nextScene: 'conhecimento', feedback: 'Remédios, alimentos, materiais... O cerrado oferece tudo.', type: 'sustentavel' },
        ],
      },
      {
        id: 'nascentes', chapter: 2, title: 'Águas que Nascem', emoji: '💧',
        narrative: 'Dezenas de nascentes estão comprometidas pelo desmatamento e agrotóxicos. Rios que abasteciam cidades inteiras estão secando.',
        choices: [
          { text: 'Criar corredor de proteção ao longo dos cursos d\'água', effects: { biodiversidade: 15, poluicao: -12, recursos: 8 }, nextScene: 'corredor', feedback: 'As matas ciliares são restauradas. As águas fluem com mais força.', type: 'sustentavel' },
          { text: 'Denunciar o uso ilegal de agrotóxicos', effects: { poluicao: -15, biodiversidade: 8, comunidade: 5 }, nextScene: 'agrotoxicos', feedback: 'A fiscalização é intensificada. As águas ficam mais limpas.', type: 'sustentavel' },
        ],
      },
      {
        id: 'soja', chapter: 2, title: 'Mar de Soja', emoji: '🚜',
        narrative: 'Trabalhando na fazenda, você vê de perto a devastação: hectares de cerrado são queimados e arados diariamente. Animais fogem em desespero. Um lobo-guará ferido aparece na beira da estrada.',
        choices: [
          { text: 'Socorrer o lobo e denunciar a queimada ilegal', effects: { biodiversidade: 10, comunidade: 5, recursos: -10 }, nextScene: 'denuncia_cerrado', feedback: 'Você perde o emprego, mas ganha a consciência limpa.', type: 'sustentavel' },
          { text: 'Ignorar e continuar trabalhando', effects: { recursos: 10, biodiversidade: -15, poluicao: 10, comunidade: -10 }, nextScene: 'falha_cerrado', feedback: 'O cerrado queima. Você fecha os olhos, mas a culpa não desaparece.', type: 'arriscado' },
        ],
      },
      // Chapter 3
      {
        id: 'regularizacao', chapter: 3, title: 'Vitória da Comunidade', emoji: '📜',
        narrative: 'A terra é oficialmente titulada! A comunidade quilombola agora tem proteção legal e investe em turismo comunitário e extrativismo sustentável.',
        choices: [
          { text: 'Criar marca de produtos do cerrado com a comunidade', effects: { recursos: 15, comunidade: 12, biodiversidade: 10 }, nextScene: 'marca_cerrado', feedback: 'Baru, pequi, buriti... Produtos quilombolas conquistam o mercado!', type: 'sustentavel' },
          { text: 'Apenas celebrar e seguir em frente', effects: { comunidade: 5 }, nextScene: 'estagnacao', feedback: 'A titulação é uma vitória, mas sem ação concreta o cerrado continua ameaçado.', type: 'neutro' },
        ],
      },
      {
        id: 'conhecimento', chapter: 3, title: 'Biblioteca Viva', emoji: '📚',
        narrative: 'A documentação gera um livro sobre plantas medicinais do cerrado. Universidades se interessam e a comunidade ganha reconhecimento.',
        choices: [
          { text: 'Criar jardim botânico comunitário do cerrado', effects: { biodiversidade: 15, comunidade: 12, recursos: 10 }, nextScene: 'jardim_cerrado', feedback: 'O jardim se torna ponto de turismo e pesquisa!', type: 'sustentavel' },
        ],
      },
      {
        id: 'corredor', chapter: 3, title: 'Veias da Terra', emoji: '🌊',
        narrative: 'Os corredores ecológicos conectam fragmentos de cerrado isolados. Animais podem migrar e as nascentes se recuperam.',
        choices: [
          { text: 'Expandir o projeto para toda a bacia hidrográfica', effects: { biodiversidade: 15, poluicao: -12, comunidade: 10, recursos: 8 }, nextScene: 'bacia', feedback: 'A bacia inteira se recupera! Modelo para todo o cerrado.', type: 'sustentavel' },
          { text: 'Manter apenas a área atual', effects: { biodiversidade: 5 }, nextScene: 'estagnacao', feedback: 'O projeto funciona localmente, mas fragmentos isolados continuam desaparecendo.', type: 'neutro' },
        ],
      },
      {
        id: 'agrotoxicos', chapter: 3, title: 'Água Limpa', emoji: '💚',
        narrative: 'A fiscalização reduz o uso ilegal de agrotóxicos. As águas melhoram e agricultores buscam alternativas orgânicas.',
        choices: [
          { text: 'Apoiar transição para agricultura orgânica', effects: { poluicao: -15, biodiversidade: 10, recursos: 10, comunidade: 10 }, nextScene: 'organico', feedback: 'O cerrado sem veneno! Saúde para todos.', type: 'sustentavel' },
        ],
      },
      {
        id: 'denuncia_cerrado', chapter: 3, title: 'Justiça no Cerrado', emoji: '⚖️',
        narrative: 'A denúncia resulta em multas e embargo da fazenda. O lobo-guará é tratado e solto. Mas você está desempregado e os fazendeiros te ameaçam.',
        choices: [
          { text: 'Buscar apoio de ONGs e iniciar projeto de restauração', effects: { biodiversidade: 12, comunidade: 10, recursos: 5 }, nextScene: 'restauracao_cerrado', feedback: 'A ONG te contrata! Agora você trabalha pelo cerrado profissionalmente.', type: 'sustentavel' },
          { text: 'Ceder às ameaças e ir embora', effects: { biodiversidade: -5, comunidade: -10 }, nextScene: 'final_neutro', feedback: 'A fuga salva você, mas o cerrado perde um defensor.', type: 'neutro' },
        ],
      },
      // Chapter 4
      {
        id: 'marca_cerrado', chapter: 4, title: 'Sabores do Cerrado', emoji: '🍯',
        narrative: 'A marca "Sabores do Cerrado" é um sucesso. Mas intermediários querem comprar a produção por preços baixos e vender caro, tirando o lucro da comunidade.',
        choices: [
          { text: 'Vender direto ao consumidor via internet e feiras', effects: { recursos: 15, comunidade: 15, biodiversidade: 10 }, nextScene: 'final_restaurado', feedback: 'Sem intermediários, a comunidade fica com todo o lucro! Modelo replicado em todo o cerrado.', type: 'sustentavel' },
          { text: 'Aceitar a oferta dos intermediários', effects: { recursos: 5, comunidade: -5 }, nextScene: 'final_neutro', feedback: 'A comunidade perde poder. O projeto sobrevive, mas sem protagonismo.', type: 'neutro' },
        ],
      },
      {
        id: 'estagnacao', chapter: 4, title: 'Oportunidade Perdida', emoji: '⏳',
        narrative: 'Sem ação decisiva, o cerrado ao redor continua sendo desmatado. A área protegida se torna uma ilha verde isolada.',
        choices: [
          { text: 'Finalmente agir e buscar parcerias para expansão', effects: { biodiversidade: 8, comunidade: 5 }, nextScene: 'final_neutro', feedback: 'Tarde, mas melhor que nunca. O cerrado sobrevive em fragmentos.', type: 'neutro' },
          { text: 'Aceitar que o cerrado está perdido', effects: { biodiversidade: -10 }, nextScene: 'final_degradado', feedback: 'A resignação é o pior inimigo da natureza.', type: 'arriscado' },
        ],
      },
      {
        id: 'jardim_cerrado', chapter: 4, title: 'Semente de Futuro', emoji: '🌿',
        narrative: 'O jardim botânico atrai pesquisadores do mundo todo. Novas espécies são descobertas e medicamentos potenciais identificados. Mas uma mineradora quer explorar a área.',
        choices: [
          { text: 'Mobilizar cientistas e comunidade contra a mineração', effects: { biodiversidade: 18, comunidade: 15 }, nextScene: 'final_restaurado', feedback: 'A ciência vence a ganância! A área é protegida permanentemente.', type: 'sustentavel' },
          { text: 'Permitir mineração controlada em troca de compensação', effects: { recursos: 10, biodiversidade: -12, poluicao: 10 }, nextScene: 'final_degradado', feedback: 'A mineração destrói o jardim. Espécies únicas são perdidas para sempre.', type: 'arriscado' },
        ],
      },
      {
        id: 'bacia', chapter: 4, title: 'Rios Renascidos', emoji: '🏞️',
        narrative: 'A restauração da bacia hidrográfica traz água de volta para cidades inteiras. O projeto ganha prêmio internacional.',
        choices: [
          { text: 'Criar programa nacional de restauração de bacias do cerrado', effects: { biodiversidade: 20, poluicao: -15, comunidade: 12, recursos: 12 }, nextScene: 'final_restaurado', feedback: 'O programa se torna política pública! O berço das águas do Brasil é protegido.', type: 'sustentavel' },
        ],
      },
      {
        id: 'organico', chapter: 4, title: 'Cerrado Sem Veneno', emoji: '🌱',
        narrative: 'A transição orgânica conquista fazendeiros e consumidores. Alimentos saudáveis e cerrado preservado. Mas pressão do agronegócio tenta reverter as leis.',
        choices: [
          { text: 'Criar cooperativa de produtores orgânicos do cerrado', effects: { recursos: 15, biodiversidade: 12, comunidade: 15 }, nextScene: 'final_restaurado', feedback: 'A cooperativa é imbatível! Produção orgânica vira referência nacional.', type: 'sustentavel' },
          { text: 'Deixar cada fazendeiro decidir sozinho', effects: { biodiversidade: -5, recursos: 5 }, nextScene: 'final_neutro', feedback: 'Sem organização, muitos voltam aos agrotóxicos por pressão econômica.', type: 'neutro' },
        ],
      },
      {
        id: 'restauracao_cerrado', chapter: 4, title: 'Cerrado Renascendo', emoji: '🦎',
        narrative: 'O projeto de restauração planta milhares de espécies nativas. Lobos-guarás, tucanos e tamanduás retornam. A paisagem se transforma.',
        choices: [
          { text: 'Expandir para criar o maior corredor de cerrado do Brasil', effects: { biodiversidade: 18, comunidade: 12, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'O corredor conecta fragmentos por centenas de quilômetros! Vida plena!', type: 'sustentavel' },
        ],
      },
      // Chapter 5 endings
      { id: 'final_restaurado', chapter: 5, title: '🏆 Cerrado Restaurado!', emoji: '🌟', narrative: 'O cerrado se recupera! Nascentes brotam, lobos-guarás correm pelos campos e comunidades tradicionais prosperam. Você provou que é possível produzir e conservar ao mesmo tempo. O berço das águas do Brasil está protegido!', choices: [], isEnding: true, endingType: 'restaurado' },
      { id: 'final_degradado', chapter: 5, title: '💔 Cerrado em Agonia', emoji: '😔', narrative: 'O avanço agrícola não parou. Nascentes secaram, animais desapareceram e comunidades foram expulsas. O cerrado agoniza sob monoculturas infinitas.', choices: [], isEnding: true, endingType: 'degradado' },
      { id: 'final_neutro', chapter: 5, title: '⚖️ Cerrado Dividido', emoji: '🤔', narrative: 'Algumas áreas foram protegidas, mas muitas foram perdidas. O cerrado sobrevive em fragmentos, como ilhas verdes num mar de soja.', choices: [], isEnding: true, endingType: 'neutro' },
      { id: 'falha_cerrado', chapter: 5, title: '🔥 Missão Fracassada', emoji: '💀', narrative: 'Sua omissão e ganância permitiram a destruição total. O cerrado virou cinzas, os rios secaram e as comunidades tradicionais perderam tudo. Onde havia vida, só resta pó e arrependimento. O coração do Brasil parou de bater.', choices: [], isEnding: true, endingType: 'degradado' },
    ],
  },

  montanha: {
    biomeId: 'montanha',
    biomeName: 'Serra da Mantiqueira',
    biomeEmoji: '🏔️',
    biomeColor: 'hsl(215, 28%, 50%)',
    backgroundGradient: 'from-slate-800 via-gray-700 to-stone-800',
    description: 'Preserve as montanhas e suas nascentes.',
    scenes: [
      {
        id: 'inicio', chapter: 1, title: 'No Topo do Mundo', emoji: '⛰️',
        narrative: 'Você chega à Serra da Mantiqueira, onde picos enevoados abrigam nascentes cristalinas e florestas de altitude. Mas o turismo desordenado, a expansão urbana e o fogo ameaçam esse santuário.',
        choices: [
          { text: 'Percorrer as trilhas para avaliar o estado de conservação', effects: { biodiversidade: 8, comunidade: 5 }, nextScene: 'trilhas', feedback: 'Você encontra trilhas erodidas, lixo e sinais de queimadas recentes.', type: 'sustentavel' },
          { text: 'Reunir a comunidade local para discutir os problemas', effects: { comunidade: 12, recursos: 5 }, nextScene: 'reuniao', feedback: 'A comunidade está preocupada. Todos querem ajudar.', type: 'sustentavel' },
          { text: 'Comprar terreno para construir um condomínio de luxo', effects: { recursos: 15, biodiversidade: -12, poluicao: 10 }, nextScene: 'especulacao', feedback: 'A especulação imobiliária avança. Mais floresta é derrubada para construção.', type: 'arriscado' },
        ],
      },
      // Chapter 2
      {
        id: 'trilhas', chapter: 2, title: 'Caminhos Feridos', emoji: '🥾',
        narrative: 'As trilhas mostram o impacto do turismo sem controle. Plantas raras são pisoteadas, nascentes contaminadas e o barulho afasta a fauna.',
        choices: [
          { text: 'Implementar sistema de trilhas com limite de visitantes', effects: { biodiversidade: 12, poluicao: -10, comunidade: 8, recursos: 5 }, nextScene: 'trilhas_sustentaveis', feedback: 'Trilhas demarcadas, guias obrigatórios e limite diário. A serra respira!', type: 'sustentavel' },
          { text: 'Treinar condutores locais como guias de ecoturismo', effects: { comunidade: 15, recursos: 12, biodiversidade: 5 }, nextScene: 'guias_serra', feedback: 'Moradores se tornam os melhores guias, com conhecimento ancestral.', type: 'sustentavel' },
        ],
      },
      {
        id: 'reuniao', chapter: 2, title: 'Vozes da Serra', emoji: '🗣️',
        narrative: 'Na reunião, opiniões divergem. Donos de pousadas querem mais turistas, agricultores reclamam da falta de água e ambientalistas pedem proteção total.',
        choices: [
          { text: 'Propor um plano de uso sustentável que atenda todos', effects: { comunidade: 15, recursos: 10, biodiversidade: 8 }, nextScene: 'plano_serra', feedback: 'O plano começa a tomar forma com participação de todos.', type: 'sustentavel' },
          { text: 'Criar conselho gestor com representantes de cada setor', effects: { comunidade: 12, recursos: 8, biodiversidade: 5 }, nextScene: 'conselho_serra', feedback: 'O conselho dá voz a todos e decisões passam a ser coletivas.', type: 'sustentavel' },
        ],
      },
      {
        id: 'especulacao', chapter: 2, title: 'Preço da Ganância', emoji: '🏗️',
        narrative: 'A construção do condomínio destrói uma nascente milenar. Moradores antigos protestam: "Essa água abastecia todo o vale!" Animais fogem e erosão toma conta da encosta.',
        choices: [
          { text: 'Abandonar o projeto e ajudar a restaurar a área', effects: { comunidade: 10, biodiversidade: 8, recursos: -15 }, nextScene: 'restauracao_serra', feedback: 'A perda financeira dói, mas a consciência fala mais alto.', type: 'neutro' },
          { text: 'Continuar a construção e ignorar os protestos', effects: { recursos: 10, biodiversidade: -20, comunidade: -20, poluicao: 15 }, nextScene: 'falha_serra', feedback: 'A serra desmorona literalmente. Um deslizamento de terra destrói tudo.', type: 'arriscado' },
        ],
      },
      // Chapter 3
      {
        id: 'trilhas_sustentaveis', chapter: 3, title: 'Serra Acessível', emoji: '🏞️',
        narrative: 'O sistema funciona! Trilhas são recuperadas, a fauna retorna e turistas pagam uma taxa de conservação.',
        choices: [
          { text: 'Criar programa de restauração das áreas de altitude', effects: { biodiversidade: 15, poluicao: -10, comunidade: 10 }, nextScene: 'altitude', feedback: 'Campos de altitude e florestas nebulares são restaurados!', type: 'sustentavel' },
          { text: 'Abrir trilhas mais radicais para atrair turismo de aventura', effects: { recursos: 12, biodiversidade: -5 }, nextScene: 'aventura', feedback: 'O turismo de aventura traz dinheiro, mas as trilhas sofrem novamente.', type: 'arriscado' },
        ],
      },
      {
        id: 'guias_serra', chapter: 3, title: 'Guardiões da Serra', emoji: '🧑‍🏫',
        narrative: 'Os guias locais são um sucesso! Escolas enviam alunos para educação ambiental na serra.',
        choices: [
          { text: 'Expandir o programa para toda a Serra da Mantiqueira', effects: { comunidade: 15, recursos: 12, biodiversidade: 12 }, nextScene: 'rede_guardioes', feedback: 'Uma rede de guardiões protege toda a cadeia montanhosa!', type: 'sustentavel' },
        ],
      },
      {
        id: 'plano_serra', chapter: 3, title: 'Harmonia Possível', emoji: '📋',
        narrative: 'O plano é aprovado. Zonas de proteção, uso sustentável e turismo são demarcadas. Mas um incêndio criminoso ameaça destruir tudo.',
        choices: [
          { text: 'Criar brigada voluntária de combate a incêndios', effects: { biodiversidade: 12, comunidade: 12, poluicao: -10 }, nextScene: 'brigada_serra', feedback: 'A brigada responde rápido e salva hectares de floresta!', type: 'sustentavel' },
          { text: 'Esperar os bombeiros oficiais', effects: { biodiversidade: -10, poluicao: 5 }, nextScene: 'fogo_destruicao', feedback: 'Os bombeiros demoram. O fogo destrói metade da área protegida.', type: 'neutro' },
        ],
      },
      {
        id: 'conselho_serra', chapter: 3, title: 'Decisão Coletiva', emoji: '🤝',
        narrative: 'O conselho gestor funciona bem, mas um membro tenta aprovar construções ilegais usando influência política.',
        choices: [
          { text: 'Denunciar a corrupção e fortalecer o conselho', effects: { comunidade: 15, biodiversidade: 10 }, nextScene: 'conselho_forte', feedback: 'A transparência vence! O membro corrupto é removido.', type: 'sustentavel' },
          { text: 'Ignorar para evitar conflito', effects: { comunidade: -5, biodiversidade: -8 }, nextScene: 'final_neutro', feedback: 'O silêncio permite que a corrupção enfraqueça o conselho.', type: 'neutro' },
        ],
      },
      {
        id: 'restauracao_serra', chapter: 3, title: 'Recomeço na Serra', emoji: '🌱',
        narrative: 'A área do condomínio é restaurada. Mudas nativas são plantadas e a nascente começa a dar sinais de recuperação. A comunidade reconhece sua mudança.',
        choices: [
          { text: 'Liderar projeto de proteção permanente das nascentes', effects: { biodiversidade: 15, comunidade: 12, poluicao: -10 }, nextScene: 'nascentes_serra', feedback: 'Todas as nascentes da serra são mapeadas e protegidas!', type: 'sustentavel' },
        ],
      },
      // Chapter 4
      {
        id: 'altitude', chapter: 4, title: 'Topo Restaurado', emoji: '🌤️',
        narrative: 'As áreas de altitude são restauradas. Espécies endêmicas retornam. A serra se candidata a Reserva da Biosfera da UNESCO.',
        choices: [
          { text: 'Buscar reconhecimento como Reserva da Biosfera', effects: { biodiversidade: 18, comunidade: 12, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'A UNESCO reconhece a serra! Proteção internacional!', type: 'sustentavel' },
        ],
      },
      {
        id: 'aventura', chapter: 4, title: 'Risco Calculado?', emoji: '🧗',
        narrative: 'O turismo de aventura cresce, mas um acidente grave numa trilha perigosa gera crise. A serra ameaça ser fechada para visitantes.',
        choices: [
          { text: 'Implementar regulamentação séria de segurança', effects: { comunidade: 8, biodiversidade: 5, recursos: 5 }, nextScene: 'final_neutro', feedback: 'A regulamentação salva o turismo, mas a reputação ficou abalada.', type: 'neutro' },
          { text: 'Fechar as trilhas radicais e voltar ao ecoturismo', effects: { biodiversidade: 10, comunidade: 10 }, nextScene: 'final_restaurado', feedback: 'A serra volta ao equilíbrio. Ecoturismo responsável prevalece.', type: 'sustentavel' },
        ],
      },
      {
        id: 'rede_guardioes', chapter: 4, title: 'Rede Protetora', emoji: '🛡️',
        narrative: 'A rede de guardiões da serra é modelo para todo o Brasil. Centenas de voluntários monitoram a serra com drones e sensores.',
        choices: [
          { text: 'Expandir para criar parque estadual permanente', effects: { biodiversidade: 20, comunidade: 15, poluicao: -15 }, nextScene: 'final_restaurado', feedback: 'O Parque Estadual da Serra é criado! Proteção permanente!', type: 'sustentavel' },
        ],
      },
      {
        id: 'brigada_serra', chapter: 4, title: 'Escudo de Fogo', emoji: '🧯',
        narrative: 'A brigada se torna referência. Com equipamentos e treinamento, incêndios são controlados rapidamente.',
        choices: [
          { text: 'Criar sistema de monitoramento por drones e satélites', effects: { biodiversidade: 15, poluicao: -12, recursos: 8 }, nextScene: 'final_restaurado', feedback: 'Tecnologia e comunidade juntas! Nenhum fogo passa despercebido.', type: 'sustentavel' },
        ],
      },
      {
        id: 'fogo_destruicao', chapter: 4, title: 'Cinzas na Serra', emoji: '🔥',
        narrative: 'O fogo destruiu metade da floresta protegida. Nascentes secaram e animais morreram. A comunidade chora a perda.',
        choices: [
          { text: 'Iniciar replantio emergencial e criar brigada para o futuro', effects: { biodiversidade: 8, comunidade: 10 }, nextScene: 'final_neutro', feedback: 'A serra pode se recuperar, mas levará décadas. A lição foi dura.', type: 'sustentavel' },
          { text: 'Abandonar a área e focar em outros projetos', effects: { biodiversidade: -10, comunidade: -10 }, nextScene: 'final_degradado', feedback: 'Sem recuperação, a serra se degrada permanentemente.', type: 'arriscado' },
        ],
      },
      {
        id: 'conselho_forte', chapter: 4, title: 'Governança Verde', emoji: '🏛️',
        narrative: 'O conselho fortalecido se torna modelo de governança ambiental. Decisões são transparentes e a serra prospera.',
        choices: [
          { text: 'Replicar o modelo em outras serras do Brasil', effects: { comunidade: 18, biodiversidade: 12, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'O modelo de governança participativa se espalha pelo país!', type: 'sustentavel' },
        ],
      },
      {
        id: 'nascentes_serra', chapter: 4, title: 'Águas Protegidas', emoji: '💧',
        narrative: 'Todas as nascentes da serra estão mapeadas e protegidas. A água volta a fluir e cidades inteiras se beneficiam.',
        choices: [
          { text: 'Criar fundo de pagamento por serviços ambientais', effects: { recursos: 15, biodiversidade: 15, comunidade: 12 }, nextScene: 'final_restaurado', feedback: 'Quem protege a água é pago por isso! Modelo justo e sustentável.', type: 'sustentavel' },
        ],
      },
      // Chapter 5 endings
      { id: 'final_restaurado', chapter: 5, title: '🏆 Serra Restaurada!', emoji: '🌟', narrative: 'A Serra da Mantiqueira brilha novamente! Nascentes cristalinas, florestas preservadas e comunidades prósperas. As montanhas são guardiãs da água e da vida, protegidas para sempre!', choices: [], isEnding: true, endingType: 'restaurado' },
      { id: 'final_degradado', chapter: 5, title: '💔 Serra Perdida', emoji: '😔', narrative: 'Incêndios, construções e descaso destruíram o que levou milhões de anos para se formar. Nascentes secaram, espécies desapareceram.', choices: [], isEnding: true, endingType: 'degradado' },
      { id: 'final_neutro', chapter: 5, title: '⚖️ Serra Resistente', emoji: '🤔', narrative: 'A serra sobrevive, mas com cicatrizes. Algumas áreas foram salvas, outras perdidas. A luta continua.', choices: [], isEnding: true, endingType: 'neutro' },
      { id: 'falha_serra', chapter: 5, title: '⛰️ Missão Fracassada', emoji: '💀', narrative: 'A ganância destruiu a serra. Um deslizamento de terra causado pelo desmatamento soterrou construções e nascentes. A serra, que levou milhões de anos para se formar, foi destruída em meses pela ambição humana. As águas que alimentavam cidades inteiras secaram para sempre.', choices: [], isEnding: true, endingType: 'degradado' },
    ],
  },

  caatinga: {
    biomeId: 'caatinga',
    biomeName: 'Caatinga Nordestina',
    biomeEmoji: '🌵',
    biomeColor: 'hsl(30, 80%, 55%)',
    backgroundGradient: 'from-orange-900 via-amber-800 to-yellow-900',
    description: 'Combata a desertificação no semiárido.',
    scenes: [
      {
        id: 'inicio', chapter: 1, title: 'Terra Seca, Coração Forte', emoji: '☀️',
        narrative: 'Você chega ao sertão nordestino durante uma seca severa. A caatinga sofre com desmatamento para lenha, criação extensiva de cabras e mudanças climáticas. Dona Francisca mostra uma nascente que secou: "Antes tinha água o ano todo. Agora, só saudade."',
        choices: [
          { text: 'Ajudar a construir cisternas para captar água da chuva', effects: { recursos: 15, comunidade: 10 }, nextScene: 'cisternas', feedback: 'Água é vida no sertão! As cisternas garantem sobrevivência.', type: 'sustentavel' },
          { text: 'Estudar técnicas de convivência com o semiárido', effects: { recursos: 10, biodiversidade: 8, comunidade: 5 }, nextScene: 'convivencia', feedback: 'Conviver com a seca, não combatê-la. Mudança de paradigma!', type: 'sustentavel' },
          { text: 'Vender a lenha da caatinga para carvoarias', effects: { recursos: 15, biodiversidade: -15, poluicao: 10 }, nextScene: 'carvoaria', feedback: 'Dinheiro rápido, mas cada árvore derrubada acelera a desertificação.', type: 'arriscado' },
        ],
      },
      // Chapter 2
      {
        id: 'cisternas', chapter: 2, title: 'Água no Sertão', emoji: '💧',
        narrative: 'As cisternas mudam a vida das famílias! Crianças não andam mais quilômetros para buscar água. Mas a vegetação continua sendo derrubada para lenha.',
        choices: [
          { text: 'Introduzir fogões solares e biogás como alternativa', effects: { poluicao: -15, biodiversidade: 12, recursos: 8 }, nextScene: 'energia_limpa', feedback: 'Sem queimar lenha, a caatinga pode se regenerar!', type: 'sustentavel' },
          { text: 'Criar programa de palma forrageira para o gado', effects: { recursos: 12, biodiversidade: 5, comunidade: 8 }, nextScene: 'palma', feedback: 'A palma alimenta o rebanho sem desmatar mais caatinga.', type: 'sustentavel' },
        ],
      },
      {
        id: 'convivencia', chapter: 2, title: 'Lições do Sertão', emoji: '🧠',
        narrative: 'Você aprende sobre mandala de cultivo, barragens subterrâneas e plantas nativas resistentes à seca. O sertanejo tem soluções que a ciência está redescobrindo.',
        choices: [
          { text: 'Criar escola de convivência com o semiárido', effects: { comunidade: 15, recursos: 12, biodiversidade: 8 }, nextScene: 'escola_sertao', feedback: 'A escola atrai pessoas de todo o Nordeste!', type: 'sustentavel' },
          { text: 'Implementar quintais produtivos com espécies nativas', effects: { biodiversidade: 12, recursos: 12, comunidade: 8 }, nextScene: 'quintais', feedback: 'Umbuzeiros, juremas e catingueiras voltam ao dia a dia.', type: 'sustentavel' },
        ],
      },
      {
        id: 'carvoaria', chapter: 2, title: 'Cinzas no Sertão', emoji: '🪵',
        narrative: 'As carvoarias se multiplicam. A caatinga desaparece rapidamente, o solo fica exposto e a erosão acelera. Uma tempestade de areia cobre a vila — algo nunca visto antes.',
        choices: [
          { text: 'Perceber o erro e parar as carvoarias', effects: { biodiversidade: 5, recursos: -10, comunidade: 5 }, nextScene: 'arrependimento', feedback: 'Tarde, mas necessário. A caatinga precisa urgente de recuperação.', type: 'neutro' },
          { text: 'Intensificar a produção para maximizar o lucro', effects: { recursos: 10, biodiversidade: -20, poluicao: 15, comunidade: -15 }, nextScene: 'falha_caatinga', feedback: 'O sertão vira deserto. A vida abandona a terra.', type: 'arriscado' },
        ],
      },
      // Chapter 3
      {
        id: 'energia_limpa', chapter: 3, title: 'Sol do Sertão', emoji: '☀️',
        narrative: 'Fogões solares e biodigestores transformam a vida na caatinga. A vegetação se regenera e o ar fica mais limpo. Mas a seca se intensifica com as mudanças climáticas.',
        choices: [
          { text: 'Expandir energia solar para todas as comunidades', effects: { recursos: 12, poluicao: -12, comunidade: 10, biodiversidade: 8 }, nextScene: 'solar_sertao', feedback: 'O sol que castiga é o mesmo que liberta! Energia limpa para todos.', type: 'sustentavel' },
          { text: 'Focar apenas na comunidade atual', effects: { recursos: 5, biodiversidade: 3 }, nextScene: 'local_limitado', feedback: 'O projeto funciona localmente, mas a seca avança nas comunidades vizinhas.', type: 'neutro' },
        ],
      },
      {
        id: 'palma', chapter: 3, title: 'Verde no Sertão', emoji: '🌿',
        narrative: 'Os campos de palma alimentam o gado sem desmatar. A pressão sobre a caatinga diminui drasticamente.',
        choices: [
          { text: 'Criar cadeia produtiva de produtos da caatinga', effects: { recursos: 15, comunidade: 12, biodiversidade: 10 }, nextScene: 'cadeia_caatinga', feedback: 'Mel de jandaíra, licor de umbu, cosméticos de amburana... O sertão floresce!', type: 'sustentavel' },
        ],
      },
      {
        id: 'escola_sertao', chapter: 3, title: 'Saber Sertanejo', emoji: '🏫',
        narrative: 'A escola se torna referência nacional. Pesquisadores e estudantes aprendem a conviver com o semiárido.',
        choices: [
          { text: 'Criar rede de escolas do semiárido em todo o Nordeste', effects: { comunidade: 15, recursos: 10, biodiversidade: 8 }, nextScene: 'rede_escolas', feedback: 'O sertão ensina ao mundo como viver com resiliência!', type: 'sustentavel' },
        ],
      },
      {
        id: 'quintais', chapter: 3, title: 'Abundância Sertaneja', emoji: '🍯',
        narrative: 'Os quintais alimentam famílias e recuperam biodiversidade. Abelhas nativas voltam a polinizar e a caatinga renasce ao redor das casas.',
        choices: [
          { text: 'Criar selo "Sabor da Caatinga" para os produtos', effects: { recursos: 12, comunidade: 10, biodiversidade: 10 }, nextScene: 'selo_caatinga', feedback: 'Produtos certificados alcançam mercados do Brasil inteiro!', type: 'sustentavel' },
        ],
      },
      {
        id: 'arrependimento', chapter: 3, title: 'Recomeço no Sertão', emoji: '🙏',
        narrative: 'Sem a caatinga, a erosão destruiu terras férteis. Você lidera um esforço de recuperação, mas a comunidade desconfia.',
        choices: [
          { text: 'Plantar espécies nativas e criar cercados de regeneração', effects: { biodiversidade: 12, poluicao: -8, comunidade: 8 }, nextScene: 'regeneracao', feedback: 'A caatinga mostra sua incrível capacidade de se recuperar!', type: 'sustentavel' },
          { text: 'Pedir ajuda governamental e esperar', effects: { comunidade: -5, recursos: 5 }, nextScene: 'final_neutro', feedback: 'A burocracia atrasa tudo. A recuperação é mínima.', type: 'neutro' },
        ],
      },
      // Chapter 4
      {
        id: 'solar_sertao', chapter: 4, title: 'Sertão Elétrico', emoji: '⚡',
        narrative: 'Painéis solares cobrem o sertão. As comunidades geram energia e vendem o excedente. A caatinga protegida pela sombra dos painéis se regenera mais rápido.',
        choices: [
          { text: 'Criar cooperativa de energia solar comunitária', effects: { recursos: 18, comunidade: 15, biodiversidade: 10 }, nextScene: 'final_restaurado', feedback: 'O sertão se torna referência mundial em energia limpa e convivência!', type: 'sustentavel' },
        ],
      },
      {
        id: 'local_limitado', chapter: 4, title: 'Vizinhos em Crise', emoji: '🏚️',
        narrative: 'As comunidades vizinhas migram em massa. A seca e o desmatamento tornaram suas terras inabitáveis. Refugiados climáticos chegam ao seu projeto.',
        choices: [
          { text: 'Expandir o projeto e acolher as famílias', effects: { comunidade: 15, biodiversidade: 5, recursos: -5 }, nextScene: 'final_neutro', feedback: 'O acolhimento salva vidas, mas os recursos são limitados.', type: 'sustentavel' },
          { text: 'Fechar as portas e proteger apenas o que tem', effects: { comunidade: -15, recursos: 5 }, nextScene: 'final_degradado', feedback: 'O egoísmo isola sua comunidade. Sem vizinhos, não há futuro.', type: 'arriscado' },
        ],
      },
      {
        id: 'cadeia_caatinga', chapter: 4, title: 'Economia do Sertão', emoji: '📦',
        narrative: 'Os produtos da caatinga conquistam mercados nacionais. A renda das famílias triplica e a vegetação nativa é valorizada.',
        choices: [
          { text: 'Criar reserva de patrimônio natural da caatinga', effects: { biodiversidade: 18, comunidade: 12, recursos: 10 }, nextScene: 'final_restaurado', feedback: 'A primeira RPPN da caatinga! Marco para a conservação do semiárido.', type: 'sustentavel' },
        ],
      },
      {
        id: 'rede_escolas', chapter: 4, title: 'Sertão Educador', emoji: '🎓',
        narrative: 'A rede de escolas forma milhares de pessoas em convivência com o semiárido. O êxodo rural diminui e jovens ficam no sertão.',
        choices: [
          { text: 'Criar universidade da caatinga com pesquisa e extensão', effects: { comunidade: 18, recursos: 15, biodiversidade: 12 }, nextScene: 'final_restaurado', feedback: 'A universidade transforma o sertão em polo de conhecimento!', type: 'sustentavel' },
        ],
      },
      {
        id: 'selo_caatinga', chapter: 4, title: 'Marca do Sertão', emoji: '🏷️',
        narrative: 'O selo "Sabor da Caatinga" é reconhecido internacionalmente. Exportações crescem e a caatinga se torna sinônimo de qualidade.',
        choices: [
          { text: 'Expandir o selo para toda a região semiárida', effects: { recursos: 15, comunidade: 15, biodiversidade: 12 }, nextScene: 'final_restaurado', feedback: 'O semiárido brasileiro se transforma pela economia sustentável!', type: 'sustentavel' },
          { text: 'Vender o selo para uma multinacional', effects: { recursos: 15, comunidade: -10, biodiversidade: -5 }, nextScene: 'final_neutro', feedback: 'A multinacional muda os padrões. Os sertanejos perdem controle.', type: 'arriscado' },
        ],
      },
      {
        id: 'regeneracao', chapter: 4, title: 'Terra Curada', emoji: '🌱',
        narrative: 'As áreas cercadas se tornam refúgios de biodiversidade. Espécies raras reaparecem. A caatinga demonstra sua incrível capacidade de regeneração.',
        choices: [
          { text: 'Transformar o projeto em programa estadual contra desertificação', effects: { biodiversidade: 18, poluicao: -12, recursos: 10, comunidade: 10 }, nextScene: 'final_restaurado', feedback: 'O programa se torna política pública! Milhares de hectares recuperados.', type: 'sustentavel' },
          { text: 'Manter apenas o projeto local', effects: { biodiversidade: 5, comunidade: 3 }, nextScene: 'final_neutro', feedback: 'O projeto local funciona, mas o deserto avança nas regiões vizinhas.', type: 'neutro' },
        ],
      },
      // Chapter 5 endings
      { id: 'final_restaurado', chapter: 5, title: '🏆 Caatinga Restaurada!', emoji: '🌟', narrative: 'A caatinga renasce! Onde havia deserto, agora há vida. Comunidades prosperam com a convivência inteligente com o semiárido. Você provou que o sertão não é problema — é solução. A caatinga, exclusividade brasileira, brilha com toda sua riqueza!', choices: [], isEnding: true, endingType: 'restaurado' },
      { id: 'final_degradado', chapter: 5, title: '💔 Caatinga Agoniza', emoji: '😔', narrative: 'A desertificação avançou. O que era caatinga virou deserto. Famílias migraram e a biodiversidade foi perdida para sempre.', choices: [], isEnding: true, endingType: 'degradado' },
      { id: 'final_neutro', chapter: 5, title: '⚖️ Sertão em Transição', emoji: '🤔', narrative: 'Algumas áreas foram recuperadas, mas a desertificação continua em outras. A luta contra o deserto é diária.', choices: [], isEnding: true, endingType: 'neutro' },
      { id: 'falha_caatinga', chapter: 5, title: '🏜️ Missão Fracassada', emoji: '💀', narrative: 'A ganância pela lenha e pelo carvão destruiu a caatinga completamente. O sertão virou deserto de verdade — sem vida, sem água, sem esperança. Famílias inteiras foram forçadas a migrar, abandonando terras que habitavam há séculos. A caatinga, bioma exclusivo do Brasil, desapareceu por causa da sua ambição.', choices: [], isEnding: true, endingType: 'degradado' },
    ],
  },
};
