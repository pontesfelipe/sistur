// Tradução dos e-mails: a frase em português é a chave (mesmo esquema da app).
// Textos sem tradução caem no português.
export type EmailLang = 'pt-BR' | 'en' | 'es'

export const normalizeLang = (l?: string | null): EmailLang =>
  l === 'en' || l === 'es' ? l : 'pt-BR'

const D: Record<string, [string, string]> = {
  'Olá, {name}!': ['Hello, {name}!', '¡Hola, {name}!'],
  'Olá!': ['Hello!', '¡Hola!'],
  'Obrigado, {name}!': ['Thank you, {name}!', '¡Gracias, {name}!'],
  'Obrigado!': ['Thank you!', '¡Gracias!'],
  'Acessar o SISTUR': ['Open SISTUR', 'Acceder a SISTUR'],
  'Equipe SISTUR — Sistema Integrado de Suporte para Turismo em Regiões': ['SISTUR Team — Integrated Support System for Tourism in Regions', 'Equipo SISTUR — Sistema Integrado de Apoyo al Turismo en Regiones'],
  'Administrador': ['Administrator', 'Administrador'],
  'Analista': ['Analyst', 'Analista'],
  'Visualizador': ['Viewer', 'Visualizador'],
  'Estudante': ['Student', 'Estudiante'],
  'Professor': ['Teacher', 'Profesor'],
  'ERP — Diagnóstico e Gestão': ['ERP — Diagnostics and Management', 'ERP — Diagnóstico y Gestión'],
  'EDU — Educação e Capacitação': ['EDU — Education and Training', 'EDU — Educación y Capacitación'],
  // access-approved
  'Seu acesso ao SISTUR foi aprovado!': ['Your SISTUR access has been approved!', '¡Tu acceso a SISTUR ha sido aprobado!'],
  'Temos boas notícias — sua solicitação de acesso ao SISTUR foi aprovada.': ['Good news — your request to access SISTUR has been approved.', 'Buenas noticias: tu solicitud de acceso a SISTUR ha sido aprobada.'],
  'Sistema:': ['System:', 'Sistema:'],
  'Perfil:': ['Profile:', 'Perfil:'],
  'Você já pode acessar a plataforma e começar a utilizar todas as funcionalidades disponíveis para o seu perfil.': ['You can now sign in and start using all features available for your profile.', 'Ya puedes acceder a la plataforma y comenzar a usar todas las funciones disponibles para tu perfil.'],
  // access-requested
  'Recebemos sua solicitação de acesso ao SISTUR': ['We received your request to access SISTUR', 'Recibimos tu solicitud de acceso a SISTUR'],
  'Recebemos sua solicitação de acesso ao SISTUR. Obrigado pelo seu interesse!': ['We received your request to access SISTUR. Thank you for your interest!', 'Recibimos tu solicitud de acceso a SISTUR. ¡Gracias por tu interés!'],
  'Sistema solicitado:': ['Requested system:', 'Sistema solicitado:'],
  'Perfil solicitado:': ['Requested profile:', 'Perfil solicitado:'],
  '🚧 Plataforma em Construção': ['🚧 Platform Under Construction', '🚧 Plataforma en Construcción'],
  'O SISTUR está em fase de desenvolvimento ativo. Algumas funcionalidades podem estar em construção ou sofrer alterações. Estamos trabalhando para oferecer a melhor experiência possível.': ['SISTUR is under active development. Some features may still be under construction or may change. We are working to deliver the best possible experience.', 'SISTUR está en fase de desarrollo activo. Algunas funciones pueden estar en construcción o sufrir cambios. Trabajamos para ofrecer la mejor experiencia posible.'],
  'Sua solicitação será analisada pela nossa equipe. Assim que seu acesso for liberado, você receberá um e-mail de confirmação com os próximos passos.': ['Our team will review your request. As soon as your access is granted, you will receive a confirmation email with the next steps.', 'Nuestro equipo analizará tu solicitud. En cuanto se libere tu acceso, recibirás un correo de confirmación con los próximos pasos.'],
  'Enquanto isso, fique à vontade para explorar nosso conteúdo público ou entrar em contato caso tenha alguma dúvida.': ['Meanwhile, feel free to explore our public content or contact us if you have any questions.', 'Mientras tanto, siéntete libre de explorar nuestro contenido público o contactarnos si tienes dudas.'],
  // custom-message
  'Comunicado do SISTUR': ['SISTUR announcement', 'Comunicado de SISTUR'],
  'Você recebeu uma comunicação da equipe SISTUR.': ['You have received a message from the SISTUR team.', 'Has recibido un comunicado del equipo SISTUR.'],
  // edu
  'Você conquistou uma nova badge no SISTUR': ['You earned a new badge on SISTUR', 'Ganaste una nueva insignia en SISTUR'],
  '🏆 Nova badge conquistada!': ['🏆 New badge earned!', '🏆 ¡Nueva insignia conseguida!'],
  'Você acaba de conquistar a badge': ['You have just earned the badge', 'Acabas de conseguir la insignia'],
  'Conquista': ['Achievement', 'Logro'],
  'e ganhou': ['and earned', 'y ganaste'],
  'Continue assim — cada badge é um marco da sua jornada.': ['Keep it up — every badge is a milestone in your journey.', 'Sigue así: cada insignia es un hito en tu camino.'],
  'Ver minhas conquistas': ['View my achievements', 'Ver mis logros'],
  '🏆 Você conquistou a badge "{badge}"': ['🏆 You earned the badge "{badge}"', '🏆 Conseguiste la insignia "{badge}"'],
  'Parabéns! Você subiu para o nível {level} no SISTUR': ['Congratulations! You reached level {level} on SISTUR', '¡Felicidades! Subiste al nivel {level} en SISTUR'],
  '🎉 Você subiu de nível!': ['🎉 You leveled up!', '🎉 ¡Subiste de nivel!'],
  'Excelente trabalho — você acaba de alcançar o': ['Great work — you have just reached', 'Excelente trabajo: acabas de alcanzar el'],
  'Nível': ['Level', 'Nivel'],
  'com': ['with', 'con'],
  'acumulados': ['accumulated', 'acumulados'],
  'Continue evoluindo na sua trilha de aprendizado e desbloqueie novas recompensas.': ['Keep progressing on your learning path and unlock new rewards.', 'Sigue avanzando en tu ruta de aprendizaje y desbloquea nuevas recompensas.'],
  '🎉 Nível {level} desbloqueado no SISTUR': ['🎉 Level {level} unlocked on SISTUR', '🎉 Nivel {level} desbloqueado en SISTUR'],
  // observatory
  'Alerta crítico no Observatório: {metric}': ['Critical alert in the Observatory: {metric}', 'Alerta crítica en el Observatorio: {metric}'],
  'indicador': ['indicator', 'indicador'],
  'SISTUR — Observatório': ['SISTUR — Observatory', 'SISTUR — Observatorio'],
  '⚠️ Alerta crítico detectado': ['⚠️ Critical alert detected', '⚠️ Alerta crítica detectada'],
  'O Observatório Turístico identificou uma variação crítica em': ['The Tourism Observatory identified a critical change in', 'El Observatorio Turístico identificó una variación crítica en'],
  'seu destino': ['your destination', 'tu destino'],
  'Indicador': ['Indicator', 'Indicador'],
  'Período': ['Period', 'Período'],
  'Variação': ['Change', 'Variación'],
  'Abrir Observatório': ['Open Observatory', 'Abrir Observatorio'],
  'Você está recebendo este alerta porque administra um destino monitorado no SISTUR.': ['You are receiving this alert because you manage a destination monitored on SISTUR.', 'Recibes esta alerta porque administras un destino monitoreado en SISTUR.'],
  '⚠️ Alerta crítico — {metric} ({org})': ['⚠️ Critical alert — {metric} ({org})', '⚠️ Alerta crítica — {metric} ({org})'],
  'Observatório': ['Observatory', 'Observatorio'],
  'destino': ['destination', 'destino'],
  // regression
  'Regressão detectada em {name}': ['Regression detected in {name}', 'Regresión detectada en {name}'],
  'seu diagnóstico': ['your diagnostic', 'tu diagnóstico'],
  'SISTUR — Diagnóstico': ['SISTUR — Diagnostics', 'SISTUR — Diagnóstico'],
  '⚠️ Regressão detectada': ['⚠️ Regression detected', '⚠️ Regresión detectada'],
  'Identificamos quedas superiores a 2 pontos percentuais em 2 rodadas consecutivas': ['We identified drops greater than 2 percentage points in 2 consecutive rounds', 'Identificamos caídas superiores a 2 puntos porcentuales en 2 rondas consecutivas'],
  'em': ['in', 'en'],
  ' (modo Enterprise).': [' (Enterprise mode).', ' (modo Empresarial).'],
  ' (modo Territorial).': [' (Territorial mode).', ' (modo Territorial).'],
  'Pilar': ['Pillar', 'Pilar'],
  'Variação acumulada': ['Cumulative change', 'Variación acumulada'],
  'Abrir diagnóstico': ['Open diagnostic', 'Abrir diagnóstico'],
  'Você recebeu este alerta porque é responsável por um diagnóstico monitorado no SISTUR. Comparação estritamente interna — sem ranking entre destinos.': ['You received this alert because you are responsible for a diagnostic monitored on SISTUR. Strictly internal comparison — no ranking between destinations.', 'Recibiste esta alerta porque eres responsable de un diagnóstico monitoreado en SISTUR. Comparación estrictamente interna, sin ranking entre destinos.'],
  '⚠️ Regressão detectada — {name}': ['⚠️ Regression detected — {name}', '⚠️ Regresión detectada — {name}'],
  'Diagnóstico': ['Diagnostic', 'Diagnóstico'],
  // purchase
  'Compra confirmada no SISTUR!': ['Purchase confirmed on SISTUR!', '¡Compra confirmada en SISTUR!'],
  'Compra confirmada no SISTUR': ['Purchase confirmed on SISTUR', 'Compra confirmada en SISTUR'],
  'Sua compra foi confirmada e já está disponível na sua conta.': ['Your purchase has been confirmed and is already available in your account.', 'Tu compra ha sido confirmada y ya está disponible en tu cuenta.'],
  'Item:': ['Item:', 'Artículo:'],
  'Valor:': ['Amount:', 'Importe:'],
  'Créditos:': ['Credits:', 'Créditos:'],
  'perguntas ao Professor Beni': ['questions to Professor Beni', 'preguntas al Profesor Beni'],
  'Seus créditos já foram adicionados e serão usados automaticamente quando a cota mensal do seu plano terminar.': ['Your credits have been added and will be used automatically once your plan\'s monthly quota runs out.', 'Tus créditos ya fueron añadidos y se usarán automáticamente cuando termine la cuota mensual de tu plan.'],
  'Sua assinatura está ativa e todos os recursos do plano já foram liberados. Você pode gerenciar pagamento e faturas a qualquer momento na página de assinatura.': ['Your subscription is active and all plan features are unlocked. You can manage payment and invoices at any time on the subscription page.', 'Tu suscripción está activa y todas las funciones del plan ya están habilitadas. Puedes gestionar el pago y las facturas en cualquier momento en la página de suscripción.'],
  '/mês': ['/month', '/mes'],
  '/ano': ['/year', '/año'],
}

export function tt(lang: string | undefined, key: string, vars?: Record<string, unknown>): string {
  const l = normalizeLang(lang)
  let s = l === 'pt-BR' ? key : (D[key]?.[l === 'en' ? 0 : 1] ?? key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v ?? ''))
  return s
}

/** Traduz sufixos de período em rótulos de valor (ex.: "R$ 29,00/mês"). */
export const trAmount = (lang: string | undefined, label?: string) =>
  label ? label.replace('/mês', tt(lang, '/mês')).replace('/ano', tt(lang, '/ano')) : label
