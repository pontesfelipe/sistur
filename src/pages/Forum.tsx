import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/forum/PostCard';
import { PostDetail } from '@/components/forum/PostDetail';
import { CreatePostDialog } from '@/components/forum/CreatePostDialog';
import { useForum, ForumPost } from '@/hooks/useForum';
import { useHaptic } from '@/hooks/useHaptic';
import { Plus, Search, MessageSquarePlus, Users, Globe } from 'lucide-react';

const categories = [
  { value: 'all', label: 'Todas' },
  { value: 'general', label: 'Geral' },
  { value: 'question', label: 'Dúvida' },
  { value: 'discussion', label: 'Discussão' },
  { value: 'announcement', label: 'Anúncio' },
  { value: 'resource', label: 'Recurso' },
  { value: 'tip', label: 'Dica' },
];

export default function Forum() {
  const {
    posts,
    postsLoading,
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    usePost,
    useReplies,
  } = useForum();
  const { lightTap } = useHaptic();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: selectedPost } = usePost(selectedPostId || '');
  const { data: replies } = useReplies(selectedPostId || '');

  const filteredPosts = posts?.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePostClick = (post: ForumPost) => {
    lightTap();
    setSelectedPostId(post.id);
  };

  const handleBack = () => {
    lightTap();
    setSelectedPostId(null);
  };

  const handleEditPost = (post: ForumPost) => {
    setEditingPost(post);
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingPost(null);
  };

  const isDetailView = Boolean(selectedPostId && selectedPost);

  return (
    <AppLayout
      title="Social Turismo"
      subtitle="Compartilhe conhecimento, tire dúvidas e conecte-se com a comunidade"
      actions={
        !isDetailView ? (
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        ) : undefined
      }
    >
      {isDetailView ? (
        <div className="max-w-3xl mx-auto">
          <PostDetail
            post={selectedPost!}
            replies={replies || []}
            onBack={handleBack}
            onEdit={() => handleEditPost(selectedPost!)}
          />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'org' | 'public')}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" className="flex-1 sm:flex-none gap-1">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="org" className="flex-1 sm:flex-none gap-1">
                  <Users className="h-4 w-4" />
                  Organização
                </TabsTrigger>
                <TabsTrigger value="public" className="flex-1 sm:flex-none gap-1">
                  <Globe className="h-4 w-4" />
                  Público
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Posts List */}
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredPosts?.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquarePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhum post encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Tente usar outros termos de busca' : 'Seja o primeiro a criar um post!'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Post
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts?.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => handlePostClick(post)}
                  onEdit={() => handleEditPost(post)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={handleCloseDialog}
        editPost={
          editingPost
            ? {
                id: editingPost.id,
                title: editingPost.title,
                content: editingPost.content,
                visibility: editingPost.visibility,
                category: editingPost.category,
                image_url: editingPost.image_url,
              }
            : undefined
        }
      />
    </AppLayout>
  );
}
