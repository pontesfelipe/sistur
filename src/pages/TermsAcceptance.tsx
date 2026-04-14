import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, FileText, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { toast } from 'sonner';

export default function TermsAcceptance() {
  const navigate = useNavigate();
  const { acceptTerms } = useTermsAcceptance();
  const [checked, setChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (atBottom) setScrolledToEnd(true);
  };

  const handleAccept = async () => {
    setLastError(null);
    try {
      await acceptTerms.mutateAsync();
      toast.success('Termos aceitos com sucesso');
      navigate('/', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao aceitar os termos.';
      setLastError(message);
      toast.error('Erro ao aceitar termos. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-hero flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display">Termos e Condições de Uso</h1>
            <p className="text-xs text-muted-foreground">SISTUR — Sistema Integrado de Suporte para Turismo em Regiões</p>
          </div>
        </div>

        {/* Scrollable terms content */}
        <div className="relative">
          <ScrollArea className="h-[55vh]" onScrollCapture={handleScroll}>
            <div className="px-6 py-5 prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" ref={scrollRef}>
              <TermsContent />
            </div>
          </ScrollArea>
          {!scrolledToEnd && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent flex items-end justify-center pb-2 pointer-events-none">
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              Li e concordo com os <strong>Termos e Condições de Uso</strong>, a{' '}
              <strong>Política de Privacidade</strong> e a <strong>Política de Propriedade Intelectual</strong> do SISTUR.
            </span>
          </label>
          {lastError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Não foi possível registrar a aceitação.</p>
                <p className="text-xs text-destructive/80 mt-0.5">{lastError}</p>
              </div>
            </div>
          )}
          <Button
            onClick={handleAccept}
            disabled={!checked || !scrolledToEnd || acceptTerms.isPending}
            className="w-full"
            size="lg"
          >
            {acceptTerms.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : lastError ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Aceitar e Continuar
              </>
            )}
          </Button>
          {!scrolledToEnd && (
            <p className="text-xs text-muted-foreground text-center">Role até o final do documento para habilitar a aceitação</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">Versão 1.0 — Última atualização: 25 de março de 2026</p>

      <h2 className="text-base font-bold mt-6 mb-2">1. DEFINIÇÕES</h2>
      <p><strong>"Plataforma"</strong> refere-se ao SISTUR — Sistema Integrado de Suporte para Turismo em Regiões, incluindo todos os módulos (ERP, EDU, Jogos, Fórum, Professor Beni) e quaisquer aplicações relacionadas.</p>
      <p><strong>"Titular"</strong> refere-se ao detentor dos direitos de propriedade intelectual sobre a Plataforma, incluindo seus sócios, desenvolvedores e parceiros autorizados.</p>
      <p><strong>"Usuário"</strong> refere-se a qualquer pessoa física ou jurídica que acesse ou utilize a Plataforma mediante registro.</p>
      <p><strong>"Conteúdo Gerado pelo Usuário"</strong> refere-se a dados, textos, diagnósticos, avaliações, materiais educacionais e quaisquer informações inseridas pelo Usuário na Plataforma.</p>
      <p><strong>"Dados do Diagnóstico"</strong> refere-se aos indicadores, pontuações, interpretações IGMA e demais dados gerados pelo motor de cálculo da Plataforma.</p>

      <h2 className="text-base font-bold mt-6 mb-2">2. OBJETO</h2>
      <p>Estes Termos regulam o acesso e a utilização da Plataforma SISTUR, incluindo todos os seus módulos, funcionalidades, conteúdos educacionais, ferramentas de diagnóstico e demais recursos disponibilizados ao Usuário.</p>

      <h2 className="text-base font-bold mt-6 mb-2">3. PROPRIEDADE INTELECTUAL</h2>
      <p><strong>3.1.</strong> A Plataforma SISTUR, incluindo sua metodologia baseada nos princípios sistêmicos de Mario Beni, algoritmos de cálculo (IGMA), interface gráfica, código-fonte, banco de dados, documentação técnica, conteúdos educacionais originais, e todos os elementos visuais e funcionais, são de propriedade exclusiva do Titular e estão protegidos pelas leis brasileiras e internacionais de propriedade intelectual.</p>
      <p><strong>3.2.</strong> O motor de interpretação IGMA (6 regras sistêmicas), os indicadores proprietários, as fórmulas de normalização e o framework de pilares (RA, OE, AO) constituem segredo comercial e propriedade intelectual do Titular.</p>
      <p><strong>3.3.</strong> É expressamente proibido ao Usuário: (a) copiar, reproduzir, modificar, descompilar ou realizar engenharia reversa de qualquer componente da Plataforma; (b) extrair dados em massa para fins de replicação de funcionalidades; (c) utilizar a metodologia SISTUR para desenvolver produtos concorrentes; (d) sublicenciar, alugar ou transferir o acesso à Plataforma a terceiros sem autorização prévia.</p>
      <p><strong>3.4.</strong> A marca SISTUR, logotipos, ícones e demais sinais distintivos são de uso exclusivo do Titular e não podem ser utilizados sem autorização prévia e por escrito.</p>

      <h2 className="text-base font-bold mt-6 mb-2">4. DADOS E PRIVACIDADE</h2>
      <p><strong>4.1. Dados Pessoais:</strong> A Plataforma coleta e processa dados pessoais (nome, e-mail, dados de navegação) em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Os dados pessoais serão utilizados exclusivamente para: (a) autenticação e acesso à Plataforma; (b) personalização da experiência educacional; (c) geração de certificados; (d) comunicações sobre o serviço.</p>
      <p><strong>4.2. Dados de Diagnóstico e Indicadores:</strong> Os dados de diagnósticos turísticos inseridos pelo Usuário são armazenados em servidores seguros com criptografia em repouso e em trânsito. O Titular tem direito de acesso a estes dados para fins de: (a) melhoria contínua dos algoritmos e da Plataforma; (b) geração de estatísticas agregadas e anônimas; (c) pesquisa acadêmica em parceria com instituições de ensino; (d) benchmarking e comparação entre destinos turísticos, sempre de forma agregada e anonimizada.</p>
      <p><strong>4.3. Dados Organizacionais:</strong> Dados de organizações, empresas e destinos turísticos são de propriedade das respectivas organizações, mas o Titular detém uma licença perpétua, irrevogável e não exclusiva para utilizar estes dados de forma agregada e anonimizada para fins analíticos, estatísticos e de melhoria da Plataforma.</p>
      <p><strong>4.4. Retenção de Dados:</strong> Os dados serão mantidos durante a vigência da conta do Usuário e por até 5 (cinco) anos após o encerramento, para fins legais e regulatórios. Após este período, serão anonimizados ou excluídos.</p>
      <p><strong>4.5. Portabilidade:</strong> O Usuário pode solicitar a exportação dos seus dados pessoais e do conteúdo gerado a qualquer momento através dos canais oficiais da Plataforma.</p>

      <h2 className="text-base font-bold mt-6 mb-2">5. ACESSO DO TITULAR AOS DADOS</h2>
      <p><strong>5.1.</strong> O Titular e seus representantes autorizados têm acesso irrestrito a todos os dados armazenados na Plataforma para fins de: (a) suporte técnico e resolução de problemas; (b) auditoria e conformidade; (c) manutenção e melhoria dos serviços; (d) análise de segurança e prevenção de fraudes; (e) cumprimento de obrigações legais e regulatórias.</p>
      <p><strong>5.2.</strong> Este acesso é uma condição essencial para a prestação do serviço e não pode ser restringido pelo Usuário enquanto mantiver conta ativa na Plataforma.</p>
      <p><strong>5.3.</strong> O Titular compromete-se a utilizar esse acesso de forma responsável, mantendo a confidencialidade dos dados individuais e não divulgando informações sensíveis a terceiros sem autorização.</p>

      <h2 className="text-base font-bold mt-6 mb-2">6. CONTEÚDO EDUCACIONAL</h2>
      <p><strong>6.1.</strong> Os conteúdos educacionais disponibilizados na Plataforma (cursos, trilhas, materiais, vídeos) são de propriedade do Titular ou de seus parceiros licenciados e estão protegidos por direitos autorais.</p>
      <p><strong>6.2.</strong> O Usuário recebe uma licença pessoal, intransferível e não exclusiva para acessar o conteúdo durante a vigência da sua assinatura.</p>
      <p><strong>6.3.</strong> É proibido gravar, reproduzir, distribuir ou disponibilizar conteúdos educacionais da Plataforma em qualquer meio sem autorização prévia.</p>
      <p><strong>6.4.</strong> Certificados emitidos pela Plataforma são validados por código de verificação único e representam a conclusão real dos módulos correspondentes. Qualquer tentativa de fraude resultará na revogação imediata do certificado.</p>

      <h2 className="text-base font-bold mt-6 mb-2">7. LICENCIAMENTO E PAGAMENTO</h2>
      <p><strong>7.1.</strong> O acesso à Plataforma é concedido mediante assinatura de plano (Trial, Estudante, Professor, Básico, Profissional ou Empresarial), conforme descrito na página de assinatura.</p>
      <p><strong>7.2.</strong> O período de avaliação gratuita (Trial) tem duração de 7 dias. Ao término, o Usuário deverá contratar um plano para continuar utilizando a Plataforma.</p>
      <p><strong>7.3.</strong> O Titular reserva-se o direito de alterar preços e condições dos planos com aviso prévio de 30 dias.</p>
      <p><strong>7.4.</strong> Licenças organizacionais são vinculadas à organização contratante e podem ser redistribuídas entre membros conforme os limites de cota estabelecidos.</p>

      <h2 className="text-base font-bold mt-6 mb-2">8. RESPONSABILIDADES DO USUÁRIO</h2>
      <p><strong>8.1.</strong> O Usuário é responsável pela veracidade e atualidade dos dados inseridos na Plataforma.</p>
      <p><strong>8.2.</strong> O Usuário deve manter suas credenciais de acesso em sigilo e notificar imediatamente o Titular em caso de uso não autorizado.</p>
      <p><strong>8.3.</strong> No módulo Social Turismo (Fórum), o Usuário compromete-se a não publicar conteúdo ofensivo, difamatório, ilegal ou que viole direitos de terceiros.</p>
      <p><strong>8.4.</strong> O Usuário reconhece que os diagnósticos gerados pela Plataforma têm caráter orientativo e não substituem análises técnicas aprofundadas realizadas por profissionais especializados.</p>

      <h2 className="text-base font-bold mt-6 mb-2">9. LIMITAÇÃO DE RESPONSABILIDADE</h2>
      <p><strong>9.1.</strong> O Titular não se responsabiliza por decisões tomadas pelo Usuário com base nos diagnósticos, relatórios ou recomendações gerados pela Plataforma.</p>
      <p><strong>9.2.</strong> O Titular não garante disponibilidade ininterrupta da Plataforma, podendo ocorrer manutenções programadas ou eventuais indisponibilidades técnicas.</p>
      <p><strong>9.3.</strong> Em nenhuma hipótese a responsabilidade do Titular excederá o valor total pago pelo Usuário nos 12 meses anteriores ao evento que deu origem à reclamação.</p>

      <h2 className="text-base font-bold mt-6 mb-2">10. CONFIDENCIALIDADE</h2>
      <p><strong>10.1.</strong> Ambas as partes comprometem-se a manter em sigilo as informações confidenciais a que tenham acesso em razão do uso da Plataforma.</p>
      <p><strong>10.2.</strong> Esta obrigação de confidencialidade sobrevive ao término da relação contratual por prazo indeterminado.</p>

      <h2 className="text-base font-bold mt-6 mb-2">11. RESCISÃO</h2>
      <p><strong>11.1.</strong> O Usuário pode encerrar sua conta a qualquer momento, sem direito a reembolso de valores já pagos pelo período contratado.</p>
      <p><strong>11.2.</strong> O Titular pode suspender ou encerrar a conta do Usuário em caso de violação destes Termos, com ou sem aviso prévio.</p>
      <p><strong>11.3.</strong> Após o encerramento, o Titular manterá os dados conforme a cláusula 4.4 e o Usuário perderá acesso imediato à Plataforma.</p>

      <h2 className="text-base font-bold mt-6 mb-2">12. DISPOSIÇÕES GERAIS</h2>
      <p><strong>12.1.</strong> Estes Termos são regidos pela legislação brasileira.</p>
      <p><strong>12.2.</strong> Quaisquer litígios serão dirimidos pelo Foro da Comarca da sede do Titular, com exclusão de qualquer outro por mais privilegiado que seja.</p>
      <p><strong>12.3.</strong> A tolerância do Titular quanto a qualquer descumprimento não implica renúncia ao direito de exigi-lo posteriormente.</p>
      <p><strong>12.4.</strong> O Titular reserva-se o direito de atualizar estes Termos a qualquer momento, notificando o Usuário por e-mail ou pela Plataforma. O uso continuado após a notificação implica aceitação dos novos Termos.</p>
      <p><strong>12.5.</strong> A invalidade de qualquer cláusula não afetará a validade das demais disposições destes Termos.</p>

      <div className="mt-8 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2026 SISTUR — Todos os direitos reservados.
          <br />
          Ao clicar em "Aceitar e Continuar", o Usuário declara que leu, compreendeu e concorda integralmente com todos os termos acima.
        </p>
      </div>
    </>
  );
}
