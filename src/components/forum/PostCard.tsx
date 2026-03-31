import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ForumPost, useForum } from '@/hooks/useForum';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useHaptic } from '@/hooks/useHaptic';
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Globe,
  Building2,
  Pin,
  Pencil,
  Trash2,
  FileText,
  Paperclip,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCarousel } from '@/components/ui/image-carousel';

const categoryLabels: Record<string, string> = {
  general: 'Geral',
  question: 'Dúvida',
  discussion: 'Discussão',
  announcement: 'Anúncio',
  resource: 'Recurso',
  tip: 'Dica',
};

const categoryColors: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  question: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  discussion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  announcement: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  resource: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  tip: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

interface PostCardProps {
  post: ForumPost;
  onClick?: () => void;
  onEdit?: () => void;
}

export function PostCard({ post, onClick, onEdit }: PostCardProps) {
  const { user } = useAuth();
  const { isAdmin } = useProfile();
  const { togglePostLike, deletePost, togglePin } = useForum();
  const { lightTap, mediumTap } = useHaptic();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOwner = user?.id === post.user_id;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;
  const canPin = isAdmin;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    lightTap();
    togglePostLike.mutate({ postId: post.id, isLiked: post.user_liked || false });
  };

  const handleDelete = () => {
    mediumTap();
    deletePost.mutate(post.id);
    setShowDeleteDialog(false);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    lightTap();
    togglePin.mutate({ postId: post.id, isPinned: post.is_pinned });
  };

  return (
    <>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md active:scale-[0.99]',
          post.is_pinned && 'border-primary/50 bg-primary/5'
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author?.avatar_url || ''} />
                <AvatarFallback>
                  {post.author?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{post.author?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {post.is_pinned && (
                <Badge variant="default" className="gap-1 text-xs">
                  <Pin className="h-3 w-3" />
                  Fixado
                </Badge>
              )}
              <Badge variant="secondary" className={categoryColors[post.category]}>
                {categoryLabels[post.category] || post.category}
              </Badge>
              <Badge variant="outline" className="gap-1">
                {post.visibility === 'public' ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Público
                  </>
                ) : (
                  <>
                    <Building2 className="h-3 w-3" />
                    Org
                  </>
                )}
              </Badge>

              {/* Admin pin button */}
              {canPin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8',
                        post.is_pinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                      )}
                      onClick={handleTogglePin}
                    >
                      <Pin className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {post.is_pinned ? 'Desafixar post' : 'Fixar post'}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Actions dropdown */}
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.();
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        {canEdit && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                          {isAdmin && !isOwner && (
                            <Badge variant="outline" className="ml-2 text-xs gap-1">
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
          <p className="text-muted-foreground line-clamp-3">{post.content}</p>

          {/* Image carousel or single image */}
          {(() => {
            const allImages = (post as any).image_urls?.length
              ? (post as any).image_urls
              : post.image_url ? [post.image_url] : [];
            return allImages.length > 0 ? (
              <div className="mt-3">
                <ImageCarousel images={allImages} maxHeight="h-48" />
              </div>
            ) : null;
          })()}

          {/* PDF attachment indicator */}
          {post.attachment_type === 'application/pdf' && post.attachment_url && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-muted rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                PDF anexado
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-1', post.user_liked && 'text-red-500')}
              onClick={handleLike}
            >
              <Heart className={cn('h-4 w-4', post.user_liked && 'fill-current')} />
              {post.likes_count}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.replies_count}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post e todas as respostas serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
