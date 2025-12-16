import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Download
} from 'lucide-react';

export default function Configuracoes() {
  return (
    <AppLayout title="Configurações" subtitle="Documentação, metodologia de cálculo e ferramentas do SISTUR">
      <div className="space-y-6">

        <Tabs defaultValue="metodologia" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
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

          {/* METODOLOGIA TAB */}
          <TabsContent value="metodologia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Como Funciona o Cálculo
                </CardTitle>
                <CardDescription>
                  Entenda a metodologia de avaliação dos destinos turísticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overview */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">Visão Geral</h3>
                  <p className="text-sm text-muted-foreground">
                    O SISTUR avalia destinos turísticos através de três pilares fundamentais, 
                    cada um composto por indicadores específicos que são normalizados e ponderados 
                    para gerar uma pontuação final.
                  </p>
                </div>

                {/* Three Pillars */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">RA - Recursos e Atrativos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Avalia os recursos naturais, culturais e atrativos turísticos do destino.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">OE - Oferta e Equipamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Mede a infraestrutura turística, hospedagem, alimentação e serviços disponíveis.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">AO - Ambiente Organizacional</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Analisa a gestão, governança, políticas públicas e organização do turismo local.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Calculation Steps */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step1">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">1</Badge>
                        Coleta de Dados
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-2">
                      <p>Os dados são coletados de diversas fontes:</p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li><strong>IBGE:</strong> Dados demográficos e econômicos oficiais</li>
                        <li><strong>CADASTUR:</strong> Registro de prestadores de serviços turísticos</li>
                        <li><strong>Pesquisa Local:</strong> Levantamentos de campo realizados localmente</li>
                        <li><strong>Manual:</strong> Dados inseridos manualmente pelos analistas</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step2">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">2</Badge>
                        Normalização dos Indicadores
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Cada indicador é normalizado em uma escala de 0 a 1 usando diferentes métodos:</p>
                      
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                          <Scale className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">MIN_MAX (Normalização Linear)</p>
                            <p className="text-sm">Score = (Valor - Mínimo) / (Máximo - Mínimo)</p>
                            <p className="text-xs mt-1">Usado para indicadores com escala contínua</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                          <Layers className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">BANDS (Faixas)</p>
                            <p className="text-sm">Valores categorizados em faixas predefinidas</p>
                            <p className="text-xs mt-1">Usado para indicadores qualitativos</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                          <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">BINARY (Binário)</p>
                            <p className="text-sm">Presença (1) ou ausência (0) de característica</p>
                            <p className="text-xs mt-1">Usado para indicadores de sim/não</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step3">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">3</Badge>
                        Direção do Indicador
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p>Cada indicador tem uma direção que define se valores maiores ou menores são melhores:</p>
                      
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center gap-3 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-foreground">HIGH_IS_BETTER</p>
                            <p className="text-sm">Valores mais altos = melhor desempenho</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          <TrendingDown className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-foreground">LOW_IS_BETTER</p>
                            <p className="text-sm">Valores mais baixos = melhor desempenho</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step4">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">4</Badge>
                        Cálculo dos Pilares
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p>O score de cada pilar é calculado como a média ponderada dos indicadores:</p>
                      
                      <div className="bg-muted/30 p-4 rounded-lg font-mono text-sm">
                        Score do Pilar = Σ (Score_indicador × Peso_indicador) / Σ Peso_indicador
                      </div>
                      
                      <p className="text-sm">
                        Cada indicador possui um peso que reflete sua importância relativa dentro do pilar. 
                        Indicadores com maior peso têm maior influência no score final do pilar.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step5">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">5</Badge>
                        Classificação de Severidade
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p>Os scores são classificados em três níveis de severidade:</p>
                      
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium">CRÍTICO</span>
                          </div>
                          <Badge variant="destructive">Score &lt; 0.4</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">MODERADO</span>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">0.4 ≤ Score &lt; 0.7</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-medium">BOM</span>
                          </div>
                          <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/30">Score ≥ 0.7</Badge>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step6">
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">6</Badge>
                        Detecção de Problemas e Recomendações
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3">
                      <p>O sistema identifica automaticamente problemas e gera recomendações:</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">Detecção de Problemas</p>
                            <p className="text-sm">
                              Temas com scores baixos são identificados como problemas, 
                              classificados por severidade e associados ao pilar correspondente.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">Recomendações de Cursos</p>
                            <p className="text-sm">
                              Com base nos problemas detectados, o sistema recomenda cursos 
                              de capacitação relevantes para cada área problemática identificada.
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTAÇÃO TAB */}
          <TabsContent value="documentacao" className="space-y-6">
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
                      <p className="text-sm text-muted-foreground">Documento técnico da metodologia</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Glossário de Indicadores</p>
                      <p className="text-sm text-muted-foreground">Definição de todos os indicadores</p>
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
                    Referências
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">Índice de Competitividade do Turismo</p>
                    <p className="text-sm text-muted-foreground">Ministério do Turismo - Brasil</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">Categorização dos Municípios</p>
                    <p className="text-sm text-muted-foreground">Mapa do Turismo Brasileiro</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">IBGE Cidades</p>
                    <p className="text-sm text-muted-foreground">Dados socioeconômicos municipais</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sobre o SISTUR</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  O Sistema de Indicadores de Sustentabilidade Turística (SISTUR) é uma ferramenta 
                  de diagnóstico e planejamento que permite avaliar o desenvolvimento turístico de 
                  destinos de forma sistemática e objetiva.
                </p>
                <p>
                  Desenvolvido com base em metodologias reconhecidas internacionalmente, o SISTUR 
                  integra indicadores econômicos, sociais, ambientais e de governança para fornecer 
                  uma visão holística do potencial e das necessidades de cada destino turístico.
                </p>
                <p>
                  <strong>Princípios fundamentais:</strong>
                </p>
                <ul>
                  <li>Transparência nos dados e metodologia</li>
                  <li>Rastreabilidade das fontes de informação</li>
                  <li>Avaliação individual (sem rankings comparativos)</li>
                  <li>Foco em capacitação e melhoria contínua</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FERRAMENTAS TAB */}
          <TabsContent value="ferramentas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                  <Button variant="outline" className="w-full" disabled>
                    Em breve
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Download className="h-5 w-5 text-primary" />
                    Exportar Dados
                  </CardTitle>
                  <CardDescription>
                    Exporte diagnósticos e indicadores em diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled>
                    Em breve
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Gerador de Relatórios
                  </CardTitle>
                  <CardDescription>
                    Gere relatórios personalizados em PDF
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" disabled>
                    Em breve
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integrações</CardTitle>
                <CardDescription>
                  Fontes de dados conectadas ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">IBGE</span>
                    </div>
                    <div>
                      <p className="font-medium">IBGE - API de Dados</p>
                      <p className="text-sm text-muted-foreground">Dados demográficos e econômicos</p>
                      <Badge variant="secondary" className="mt-1">Conectado</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">CAD</span>
                    </div>
                    <div>
                      <p className="font-medium">CADASTUR</p>
                      <p className="text-sm text-muted-foreground">Prestadores de serviços turísticos</p>
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
