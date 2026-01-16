import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  BookOpen,
  GraduationCap,
  FileText,
  ExternalLink,
  Star,
  Calendar,
  User,
  Library,
  Filter,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';

interface ContentItem {
  content_id: string;
  title: string;
  subtitle: string | null;
  author: string;
  content_type: string;
  primary_pillar: string;
  secondary_pillar: string | null;
  summary: string | null;
  abstract: string | null;
  keywords: string[] | null;
  topics: string[] | null;
  publication_year: number | null;
  publisher: string | null;
  source_uri: string | null;
  level: number;
  status: string;
  created_at: string;
}

function useContentItems(pillar?: string, contentType?: string) {
  return useQuery({
    queryKey: ['content-items', pillar, contentType],
    queryFn: async () => {
      let query = supabase
        .from('content_items')
        .select('*')
        .eq('status', 'published')
        .order('publication_year', { ascending: false });
      
      if (pillar && pillar !== 'all') {
        query = query.or(`primary_pillar.eq.${pillar},secondary_pillar.eq.${pillar}`);
      }
      if (contentType && contentType !== 'all') {
        query = query.eq('content_type', contentType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ContentItem[];
    },
  });
}

function useContentStats() {
  return useQuery({
    queryKey: ['content-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select('content_type, primary_pillar, status');
      
      if (error) throw error;
      
      return {
        total: data.length,
        published: data.filter(c => c.status === 'published').length,
        byType: {
          BOOK: data.filter(c => c.content_type === 'BOOK').length,
          ARTICLE: data.filter(c => c.content_type === 'ARTICLE').length,
          THESIS: data.filter(c => c.content_type === 'THESIS').length,
          VIDEO: data.filter(c => c.content_type === 'VIDEO').length,
          LECTURE: data.filter(c => c.content_type === 'LECTURE').length,
        },
        byPillar: {
          RA: data.filter(c => c.primary_pillar === 'RA').length,
          OE: data.filter(c => c.primary_pillar === 'OE').length,
          AO: data.filter(c => c.primary_pillar === 'AO').length,
        },
      };
    },
  });
}

const ContentRepository = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const { data: contents, isLoading } = useContentItems(pillarFilter, typeFilter);
  const { data: stats } = useContentStats();

  const filteredContents = contents?.filter(c => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(search) ||
      c.author.toLowerCase().includes(search) ||
      c.keywords?.some(k => k.toLowerCase().includes(search)) ||
      c.topics?.some(t => t.toLowerCase().includes(search))
    );
  }) || [];

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BOOK: 'Livro',
      ARTICLE: 'Artigo',
      THESIS: 'Tese/Dissertação',
      VIDEO: 'Vídeo',
      LECTURE: 'Palestra',
      BOOK_CHAPTER: 'Capítulo',
      INTERVIEW: 'Entrevista',
      SPEECH: 'Palestra',
      LIVE: 'Live',
    };
    return labels[type] || type;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'BOOK':
      case 'BOOK_CHAPTER':
        return <BookOpen className="h-4 w-4" />;
      case 'ARTICLE':
      case 'THESIS':
        return <FileText className="h-4 w-4" />;
      case 'VIDEO':
      case 'LECTURE':
      case 'LIVE':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <BookMarked className="h-4 w-4" />;
    }
  };

  const getPillarColor = (pillar: string) => {
    switch (pillar) {
      case 'RA':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';
      case 'OE':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'AO':
        return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const featuredContent = filteredContents.slice(0, 3);

  return (
    <AppLayout 
      title="Repositório Acadêmico" 
      subtitle="Biblioteca de referências do SISTUR baseada na obra de Mario Beni"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="catalog" className="gap-2">
            <Library className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="featured" className="gap-2">
            <Star className="h-4 w-4" />
            Destaques
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* CATALOG TAB */}
        <TabsContent value="catalog" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, autor, palavras-chave..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={pillarFilter} onValueChange={setPillarFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Pilar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="RA">I-RA</SelectItem>
                <SelectItem value="OE">I-OE</SelectItem>
                <SelectItem value="AO">I-AO</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="book">Livros</SelectItem>
                <SelectItem value="paper">Artigos</SelectItem>
                <SelectItem value="thesis">Teses</SelectItem>
                <SelectItem value="video">Vídeos</SelectItem>
                <SelectItem value="lecture">Palestras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : filteredContents.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Library className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum conteúdo encontrado</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros de busca
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContents.map((content) => (
                <Card 
                  key={content.content_id}
                  className="group hover:shadow-lg transition-all hover:border-primary/30"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {getContentTypeIcon(content.content_type)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getContentTypeLabel(content.content_type)}
                        </Badge>
                      </div>
                      <Badge className={getPillarColor(content.primary_pillar)}>
                        {PILLAR_INFO[content.primary_pillar as Pillar]?.name || content.primary_pillar}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {content.title}
                    </CardTitle>
                    {content.subtitle && (
                      <CardDescription className="line-clamp-1">
                        {content.subtitle}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span className="line-clamp-1">{content.author}</span>
                    </div>
                    {content.publication_year && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{content.publication_year}</span>
                        {content.publisher && (
                          <span className="text-xs">• {content.publisher}</span>
                        )}
                      </div>
                    )}
                    {content.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {content.summary}
                      </p>
                    )}
                    {content.keywords && content.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {content.keywords.slice(0, 3).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {content.keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{content.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    {content.source_uri && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        asChild
                      >
                        <a href={content.source_uri} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Acessar Fonte
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* FEATURED TAB */}
        <TabsContent value="featured" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Obras Fundamentais do SISTUR</h2>
            <p className="text-muted-foreground">
              Referências essenciais baseadas no trabalho pioneiro de Mario Carlos Beni
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {featuredContent.map((content) => (
                <Card key={content.content_id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/4 bg-gradient-to-br from-primary/20 to-primary/5 p-8 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-primary/60" />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex gap-2">
                          <Badge className={getPillarColor(content.primary_pillar)}>
                            {PILLAR_INFO[content.primary_pillar as Pillar]?.name}
                          </Badge>
                          {content.secondary_pillar && (
                            <Badge variant="outline">
                              {PILLAR_INFO[content.secondary_pillar as Pillar]?.name}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {getContentTypeLabel(content.content_type)}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{content.title}</h3>
                      {content.subtitle && (
                        <p className="text-muted-foreground mb-3">{content.subtitle}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-4">
                        <strong>{content.author}</strong>
                        {content.publication_year && ` (${content.publication_year})`}
                        {content.publisher && ` • ${content.publisher}`}
                      </p>
                      {content.abstract && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {content.abstract}
                        </p>
                      )}
                      {content.topics && content.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {content.topics.map((topic, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {content.source_uri && (
                        <Button asChild>
                          <a href={content.source_uri} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Acessar Obra Completa
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold text-primary">
                  {stats?.total || 0}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Library className="h-4 w-4" />
                  Total de Referências
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold text-green-600">
                  {stats?.published || 0}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  Publicados
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">
                  {stats?.byType.book || 0}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <BookMarked className="h-4 w-4" />
                  Livros
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-3xl font-bold">
                  {stats?.byType.paper || 0}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Artigos
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Por Pilar SISTUR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['RA', 'OE', 'AO'] as const).map((pillar) => {
                  const count = stats?.byPillar[pillar] || 0;
                  const total = stats?.total || 1;
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={pillar} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge className={getPillarColor(pillar)}>
                            {PILLAR_INFO[pillar].name}
                          </Badge>
                          {PILLAR_INFO[pillar].fullName}
                        </span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            pillar === 'RA' ? 'bg-emerald-500' :
                            pillar === 'OE' ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Por Tipo de Conteúdo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: 'book', label: 'Livros', icon: BookMarked },
                  { type: 'paper', label: 'Artigos', icon: FileText },
                  { type: 'thesis', label: 'Teses', icon: GraduationCap },
                  { type: 'video', label: 'Vídeos', icon: GraduationCap },
                  { type: 'lecture', label: 'Palestras', icon: GraduationCap },
                ].map(({ type, label, icon: Icon }) => (
                  <div key={type} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    <span className="font-bold">
                      {stats?.byType[type as keyof typeof stats.byType] || 0}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default ContentRepository;
