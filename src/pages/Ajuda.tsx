import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  HelpCircle, 
  BookOpen, 
  BarChart3, 
  Upload, 
  FileText, 
  GraduationCap,
  MapPin,
  ClipboardList,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const helpSections = [
  {
    title: 'Destinos',
    description: 'Cadastre e gerencie os destinos turísticos que serão avaliados pelo sistema.',
    icon: MapPin,
    href: '/destinos',
  },
  {
    title: 'Diagnósticos',
    description: 'Crie e acompanhe rodadas de diagnóstico para avaliar o desempenho dos destinos.',
    icon: ClipboardList,
    href: '/diagnosticos',
  },
  {
    title: 'Indicadores',
    description: 'Visualize o catálogo de indicadores disponíveis organizados por pilar e tema.',
    icon: BarChart3,
    href: '/indicadores',
  },
  {
    title: 'Importações',
    description: 'Importe dados de indicadores via CSV ou preencha manualmente os valores.',
    icon: Upload,
    href: '/importacoes',
  },
  {
    title: 'SISTUR EDU',
    description: 'Acesse os cursos prescritos baseados nos diagnósticos realizados.',
    icon: GraduationCap,
    href: '/cursos',
  },
  {
    title: 'Relatórios',
    description: 'Gere relatórios detalhados com análises e recomendações para os destinos.',
    icon: FileText,
    href: '/relatorios',
  },
];

export default function Ajuda() {
  return (
    <AppLayout
      title="Central de Ajuda"
      subtitle="Aprenda a utilizar todas as funcionalidades do SISTUR"
    >
      <div className="space-y-8">
        {/* Quick Start */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Guia Rápido
            </CardTitle>
            <CardDescription>
              Siga estes passos para realizar seu primeiro diagnóstico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Cadastre um destino</strong> - Acesse a página de Destinos ou use a Nova Rodada. O código IBGE é essencial para o pré-preenchimento automático.
              </li>
              <li>
                <strong className="text-foreground">Crie um diagnóstico</strong> - Na Nova Rodada, configure título e período da avaliação.
              </li>
              <li>
                <strong className="text-foreground">Pré-preencha com dados oficiais</strong> - O sistema busca automaticamente dados de IBGE, DATASUS, INEP, STN e CADASTUR.
              </li>
              <li>
                <strong className="text-foreground">Valide os dados</strong> - Revise fonte, ano e confiança de cada indicador. Confirme ou ajuste valores.
              </li>
              <li>
                <strong className="text-foreground">Complete manualmente</strong> - Preencha indicadores não cobertos pelas fontes oficiais.
              </li>
              <li>
                <strong className="text-foreground">Calcule os resultados</strong> - O sistema processará os dados validados e gerará os scores por pilar.
              </li>
              <li>
                <strong className="text-foreground">Gere relatórios</strong> - Acesse a página de Relatórios para obter análises detalhadas e recomendações.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Sections */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Funcionalidades do Sistema</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {helpSections.map((section) => (
              <Link key={section.title} to={section.href}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <section.icon className="h-5 w-5 text-primary" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Precisa de mais ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Se você não encontrou a resposta que procurava, entre em contato com nossa equipe de suporte através do email{' '}
              <a href="mailto:suporte@sistur.com.br" className="text-primary hover:underline">
                suporte@sistur.com.br
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
