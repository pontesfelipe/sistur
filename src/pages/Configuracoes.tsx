import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/users/UserManagement';
import { LogAnalytics } from '@/components/analytics/LogAnalytics';
import { NormalizationCalculator } from '@/components/tools/NormalizationCalculator';
import { CycleMonitor } from '@/components/tools/CycleMonitor';
import { DataExporter } from '@/components/tools/DataExporter';
import { 
  Calculator, 
  BookOpen, 
  Wrench, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Layers,
  AlertTriangle,
  GraduationCap,
  FileText,
  Download,
  Target,
  RefreshCw,
  Users,
  MapPin,
  Brain,
  CheckCircle2,
  Clock,
  Activity,
  Shield,
  BarChart3
} from 'lucide-react';

export default function Configuracoes() {
  return (
    <AppLayout title="Configurações" subtitle="Documentação, metodologia de cálculo e ferramentas do SISTUR">
      <div className="space-y-6">

        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="metodologia" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Metodologia
            </TabsTrigger>
            <TabsTrigger value="documentacao" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Documentação
            </TabsTrigger>
            <TabsTrigger value="ferramentas" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Ferramentas
            </TabsTrigger>
          </TabsList>

          {/* USUARIOS TAB */}
          <TabsContent value="usuarios" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs" className="space-y-6">
            <LogAnalytics />
          </TabsContent>

          {/* METODOLOGIA TAB */}
          <TabsContent value="metodologia" className="space-y-6">
            {/* Mission Statement */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <blockquote className="text-lg italic text-foreground/90 border-l-4 border-primary pl-4">
                  "O SISTUR opera como uma infraestrutura de inteligência territorial que transforma indicadores públicos em decisões estratégicas e capacitação aplicada, fechando o ciclo entre diagnóstico, ação e resultado."
                </blockquote>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Pipeline de Indicadores
                </CardTitle>
                <CardDescription>
                  Cada indicador passa obrigatoriamente por 9 etapas — nenhuma pode ser ignorada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 9-Step Pipeline */}
                <div className="grid gap-2">
                  {[
                    { step: 1, title: "Valor Bruto", desc: "Coleta do dado original", icon: Activity },
                    { step: 2, title: "Classificação Sistêmica", desc: "RA | AO | OE", icon: Layers },
                    { step: 3, title: "Normalização", desc: "Escala 0–1", icon: Scale },
                    { step: 4, title: "Status Automático", desc: "Adequado | Atenção | Crítico", icon: AlertTriangle },
                    { step: 5, title: "Interpretação Territorial", desc: "Estrutural | Gestão | Entrega", icon: MapPin },
                    { step: 6, title: "Prescrição de Capacitação", desc: "SISTUR EDU", icon: GraduationCap },
                    { step: 7, title: "Entrega aos Agentes", desc: "Gestores | Técnicos | Trade", icon: Users },
                    { step: 8, title: "Monitoramento de Evolução", desc: "Evolução | Estagnação | Regressão", icon: RefreshCw },
                    { step: 9, title: "Melhoria Contínua", desc: "Ciclo fechado", icon: Target },
                  ].map(({ step, title, desc, icon: Icon }) => (
                    <div key={step} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Badge variant="outline" className="h-7 w-7 rounded-full p-0 flex items-center justify-center shrink-0">
                        {step}
                      </Badge>
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Three Pillars */}
            <Card>
              <CardHeader>
                <CardTitle>Os Três Pilares (Taxonomia Fixa)</CardTitle>
                <CardDescription>Cada indicador pertence a exatamente UM pilar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">RA — Relações Ambientais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Contexto territorial, sociedade, meio ambiente, dados demográficos e segurança pública.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">AO — Ações Operacionais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Governança pública, planejamento, orçamento e capacidade de tomada de decisão.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">OE — Organização Estrutural</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Infraestrutura turística, serviços, mercado, produtos e entrega ao visitante.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Calculation Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Cálculo</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="sources">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-primary" />
                        Fontes de Dados
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2">
                      <p>Os dados são coletados de diversas fontes oficiais:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li><strong>IGMA:</strong> Índice Geral de Gestão Municipal Aplicado (backbone oficial)</li>
                        <li><strong>IBGE:</strong> Dados demográficos e econômicos oficiais</li>
                        <li><strong>CADASTUR:</strong> Registro de prestadores de serviços turísticos</li>
                        <li><strong>DATASUS:</strong> Dados de saúde pública</li>
                        <li><strong>INEP:</strong> Dados educacionais</li>
                        <li><strong>STN:</strong> Secretaria do Tesouro Nacional</li>
                        <li><strong>Pesquisa Local:</strong> Levantamentos de campo</li>
                        <li><strong>Manual:</strong> Dados inseridos por analistas</li>
                      </ul>
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-foreground">IGMA como Camada de Legitimidade</p>
                        <p className="text-xs mt-1">O IGMA fornece autoridade institucional. O SISTUR fornece inteligência e ação.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="normalization">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Scale className="h-4 w-4 text-primary" />
                        Normalização (0–1)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Cada indicador é normalizado em uma escala de 0 a 1:</p>
                      
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                          <Scale className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">MIN_MAX (Normalização Linear)</p>
                            <p className="text-sm font-mono">Score = (Valor - Mínimo) / (Máximo - Mínimo)</p>
                            <p className="text-xs mt-1">Para indicadores com escala contínua</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                          <Layers className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">BANDS (Faixas)</p>
                            <p className="text-sm">Valores categorizados em faixas predefinidas</p>
                            <p className="text-xs mt-1">Para indicadores qualitativos</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                          <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">BINARY (Binário)</p>
                            <p className="text-sm">Presença (1) ou ausência (0)</p>
                            <p className="text-xs mt-1">Para indicadores de sim/não</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 mt-4">
                        <div className="flex items-center gap-3 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-foreground">HIGH_IS_BETTER</p>
                            <p className="text-sm">Valores mais altos = melhor</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          <TrendingDown className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-foreground">LOW_IS_BETTER</p>
                            <p className="text-sm">Valores mais baixos = melhor</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="status">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        Status (Automático e Imutável)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p className="font-medium text-foreground">O status é computado automaticamente e NUNCA pode ser editado manualmente:</p>
                      
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-medium">ADEQUADO</span>
                          </div>
                          <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/30">Score ≥ 0.67</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium">ATENÇÃO</span>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">0.34 ≤ Score &lt; 0.67</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium">CRÍTICO</span>
                          </div>
                          <Badge variant="destructive">Score ≤ 0.33</Badge>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="interpretation">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        Interpretação Territorial (IP Central)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p>Todo indicador com status ≠ Adequado recebe uma interpretação territorial:</p>
                      
                      <div className="grid gap-3">
                        <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-l-orange-500">
                          <p className="font-medium text-foreground">ESTRUTURAL</p>
                          <p className="text-sm">Restrições de longo prazo, socioeconômicas e territoriais. Limitações históricas ou geográficas.</p>
                        </div>
                        
                        <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-l-blue-500">
                          <p className="font-medium text-foreground">GESTÃO</p>
                          <p className="text-sm">Falhas de governança, planejamento e coordenação institucional. Problemas de gestão pública.</p>
                        </div>
                        
                        <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-l-purple-500">
                          <p className="font-medium text-foreground">ENTREGA</p>
                          <p className="text-sm">Falhas de execução, qualidade de serviço e problemas na entrega ao turista.</p>
                        </div>
                      </div>
                      
                      <p className="text-xs mt-2 p-2 bg-primary/10 rounded">
                        A interpretação é determinística e baseada em regras — nunca texto livre ou opinião.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="prescription">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Sistema de Prescrição (SISTUR EDU)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p className="font-medium text-foreground">Aprendizado segue lógica de prescrição médica:</p>
                      
                      <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
                        (Indicador + Pilar + Status + Interpretação) → Cursos Prescritos → Agentes Alvo → Monitoramento
                      </div>
                      
                      <div className="mt-4">
                        <p className="font-medium text-foreground mb-2">Condições para Prescrição (TODAS obrigatórias):</p>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Status do indicador = Atenção ou Crítico</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Pilar do indicador = Pilar do curso</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Interpretação territorial alinha com intenção do curso</span>
                          </li>
                        </ul>
                      </div>

                      <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                        <p className="font-medium text-foreground text-sm">Formato Obrigatório de Justificativa:</p>
                        <p className="text-xs mt-1 italic">
                          "Esta capacitação foi prescrita porque o indicador [Nome] está [Crítico/Atenção], 
                          classificado no pilar [RA/AO/OE], com interpretação territorial [Estrutural/Gestão/Entrega]."
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="monitoring">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        Monitoramento e Evolução
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p>Indicadores são reavaliados a cada ciclo para detectar evolução:</p>
                      
                      <div className="grid gap-2">
                        <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-foreground">Evolução</p>
                            <p className="text-sm">Score aumentou ↑</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          <ArrowRight className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="font-medium text-foreground">Estagnação</p>
                            <p className="text-sm">Score inalterado →</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                          <TrendingDown className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-foreground">Regressão</p>
                            <p className="text-sm">Score diminuiu ↓</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm mt-3">
                        Se um indicador permanece Crítico por N ciclos consecutivos, as prescrições são escaladas 
                        e alertas são enviados aos gestores responsáveis.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTAÇÃO TAB */}
          <TabsContent value="documentacao" className="space-y-6">
            {/* Principles */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Brain className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Filosofia de Transformação</p>
                    <blockquote className="mt-2 text-sm italic text-foreground/80 border-l-2 border-primary pl-3">
                      "Indicadores criam obrigação. Aprendizado é execução. Monitoramento fecha o ciclo. 
                      O SISTUR não informa. O SISTUR transforma."
                    </blockquote>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Guias e Manuais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Manual do Usuário</p>
                      <p className="text-sm text-muted-foreground">Guia completo de uso do sistema</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Metodologia SISTUR</p>
                      <p className="text-sm text-muted-foreground">Pipeline de 9 etapas e regras de cálculo</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Glossário de Indicadores</p>
                      <p className="text-sm text-muted-foreground">Definição e fontes de todos os indicadores</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Guia SISTUR EDU</p>
                      <p className="text-sm text-muted-foreground">Sistema de prescrição de capacitação</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Referências Oficiais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">IGMA</p>
                    <p className="text-sm text-muted-foreground">Índice Geral de Gestão Municipal Aplicado — Backbone de legitimidade</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">Mapa do Turismo Brasileiro</p>
                    <p className="text-sm text-muted-foreground">Categorização dos Municípios Turísticos</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">IBGE Cidades</p>
                    <p className="text-sm text-muted-foreground">Dados socioeconômicos municipais</p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">CADASTUR</p>
                    <p className="text-sm text-muted-foreground">Cadastro de Prestadores de Serviços Turísticos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sobre o SISTUR</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  O Sistema de Inteligência Territorial para Sustentabilidade Turística (SISTUR) é uma 
                  infraestrutura que transforma indicadores públicos em decisões estratégicas e capacitação aplicada.
                </p>
                
                <div>
                  <p className="font-semibold text-foreground">Princípios Fundamentais:</p>
                  <ul className="mt-2 space-y-1">
                    <li><strong>Transparência:</strong> Todos os dados, fontes e cálculos são rastreáveis</li>
                    <li><strong>Sem rankings:</strong> Avaliação individual — nunca comparativa ou competitiva</li>
                    <li><strong>Determinístico:</strong> Status e prescrições são calculados automaticamente por regras</li>
                    <li><strong>Ciclo fechado:</strong> Diagnóstico → Ação → Monitoramento → Melhoria</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-foreground">O que o SISTUR NÃO faz:</p>
                  <ul className="mt-2 space-y-1">
                    <li>Rankings públicos ou benchmarking entre municípios</li>
                    <li>Simulação preditiva ou machine learning</li>
                    <li>Exploração livre de cursos (capacitação é prescrita)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-foreground">Prescrições vs. Relatórios:</p>
                  <ul className="mt-2 space-y-1">
                    <li><strong>Prescrições (SISTUR EDU):</strong> São 100% determinísticas e baseadas em regras. Cada curso é prescrito automaticamente quando: Indicador + Pilar + Status + Interpretação Territorial atendem os critérios. Nunca há IA envolvida nas prescrições.</li>
                    <li><strong>Relatórios:</strong> Utilizam IA para síntese e análise dos dados diagnósticos, gerando planos estratégicos descritivos. A IA analisa os resultados, mas não prescreve cursos — apenas descreve e contextualiza.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FERRAMENTAS TAB */}
          <TabsContent value="ferramentas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    SISTUR EDU
                  </CardTitle>
                  <CardDescription>
                    Sistema de prescrição de capacitação baseado em diagnóstico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/cursos">Acessar Prescrições</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="h-5 w-5 text-primary" />
                    Calculadora de Normalização
                  </CardTitle>
                  <CardDescription>
                    Simule o cálculo de normalização de indicadores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NormalizationCalculator />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="h-5 w-5 text-primary" />
                    Exportar Dados
                  </CardTitle>
                  <CardDescription>
                    Exporte diagnósticos e indicadores em CSV/Excel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataExporter />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Relatórios IA
                  </CardTitle>
                  <CardDescription>
                    Gere planos de desenvolvimento com análise de IA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/relatorios">Gerar Relatório</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Monitor de Ciclos
                  </CardTitle>
                  <CardDescription>
                    Acompanhe evolução, estagnação e regressão de indicadores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CycleMonitor />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-primary" />
                    Transparência de Cálculo
                  </CardTitle>
                  <CardDescription>
                    Visualize como cada score foi calculado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/diagnosticos">Ver Diagnósticos</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integrações de Dados</CardTitle>
                <CardDescription>
                  Fontes oficiais conectadas ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">IGMA</span>
                    </div>
                    <div>
                      <p className="font-medium">IGMA</p>
                      <p className="text-sm text-muted-foreground">Backbone de legitimidade</p>
                      <Badge variant="secondary" className="mt-1">Conectado</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">IBGE</span>
                    </div>
                    <div>
                      <p className="font-medium">IBGE - API de Dados</p>
                      <p className="text-sm text-muted-foreground">Dados demográficos</p>
                      <Badge variant="secondary" className="mt-1">Conectado</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">CAD</span>
                    </div>
                    <div>
                      <p className="font-medium">CADASTUR</p>
                      <p className="text-sm text-muted-foreground">Serviços turísticos</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">SUS</span>
                    </div>
                    <div>
                      <p className="font-medium">DATASUS</p>
                      <p className="text-sm text-muted-foreground">Dados de saúde</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">INEP</span>
                    </div>
                    <div>
                      <p className="font-medium">INEP</p>
                      <p className="text-sm text-muted-foreground">Dados educacionais</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">STN</span>
                    </div>
                    <div>
                      <p className="font-medium">Tesouro Nacional</p>
                      <p className="text-sm text-muted-foreground">Dados fiscais</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
