import { AppLayout } from '@/components/layout/AppLayout';
import { BeniChatBot } from '@/components/chat/BeniChatBot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Leaf, 
  Building2, 
  Cog, 
  BookOpen, 
  Lightbulb,
  GraduationCap,
  Info
} from 'lucide-react';

const TOPICS = [
  {
    icon: Leaf,
    title: 'Relações Ambientais (RA)',
    description: 'A base do sistema turístico: recursos naturais, patrimônio cultural e sustentabilidade',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  {
    icon: Building2,
    title: 'Organização Estrutural (OE)',
    description: 'Infraestrutura turística: hotéis, transporte, sinalização e equipamentos',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30'
  },
  {
    icon: Cog,
    title: 'Ações Operacionais (AO)',
    description: 'Governança do turismo: políticas públicas, qualificação e marketing',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30'
  },
  {
    icon: BookOpen,
    title: 'Motor IGMA',
    description: 'As 6 regras sistêmicas que governam recomendações e bloqueios',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30'
  }
];

export default function BeniChat() {
  return (
    <AppLayout
      title="Professor Beni"
      subtitle="Assistente virtual baseado na metodologia sistêmica do turismo"
    >
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Main Chat - takes full width on mobile */}
        <div className="lg:col-span-2 min-h-0">
          <BeniChatBot />
        </div>

        {/* Sidebar - hidden on mobile, shown on desktop */}
        <div className="hidden lg:block space-y-4">
          {/* About Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Sobre o Professor Beni
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                <strong className="text-foreground">Mario Carlos Beni</strong> é professor emérito da 
                USP e autor da teoria sistêmica do turismo, base científica do SISTUR.
              </p>
              <p>
                Este assistente virtual foi treinado com os princípios e metodologias 
                desenvolvidos pelo professor ao longo de décadas de pesquisa.
              </p>
              <div className="flex flex-wrap gap-1 pt-2">
                <Badge variant="secondary" className="text-xs">Análise Estrutural</Badge>
                <Badge variant="secondary" className="text-xs">SISTUR</Badge>
                <Badge variant="secondary" className="text-xs">Motor IGMA</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Topics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Tópicos que o Professor Domina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TOPICS.map((topic, idx) => (
                <div 
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${topic.bgColor}`}
                >
                  <topic.icon className={`h-5 w-5 shrink-0 ${topic.color}`} />
                  <div>
                    <p className="font-medium text-sm">{topic.title}</p>
                    <p className="text-xs text-muted-foreground">{topic.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Dica</AlertTitle>
            <AlertDescription className="text-sm">
              Você pode perguntar sobre qualquer aspecto da metodologia sistêmica, 
              desde conceitos básicos até interpretações avançadas de diagnósticos.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </AppLayout>
  );
}
