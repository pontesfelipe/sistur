import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ForumPost, ForumReply, useForum } from '@/hooks/useForum';
import { useAuth } from '@/hooks/useAuth';
import { useHaptic } from '@/hooks/useHaptic';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Globe,
  Building2,
  Send,
  Loader2,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  Download,
  Reply,
  CornerDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  general: 'Geral',
  question: 'Dúvida',
  discussion: 'Discussão',
  announcement: 'Anúncio',
  resource: 'Recurso',
  tip: 'Dica',
};

interface ReplyCardProps {
  reply: ForumReply;
  postId: string;
  isPostOwner: boolean;
  onReply: (replyId: string, authorName: string) => void;
  onDelete: (replyId: string) => void;
  onLike: (reply: ForumReply) => void;
  onMarkAsSolution: (replyId: string) => void;
  depth: number;
}

function ReplyCard({
  reply,
  postId,
  isPostOwner,
  onReply,
  onDelete,
  onLike,
  onMarkAsSolution,
  depth,
}: ReplyCardProps) {
  const { user } = useAuth();
  const maxDepth = 3;

  return (
    <div className={cn(depth > 0 && 'ml-6 border-l-2 border-muted pl-4')}>
      <Card
        className={cn(
          reply.is_solution && 'border-primary/50 bg-primary/5'
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={reply.author?.avatar_url || ''} />
                <AvatarFallback>
                  {reply.author?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{reply.author?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(reply.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
              {reply.is_solution && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Solução
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isPostOwner && !reply.is_solution && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsSolution(reply.id)}
                  className="text-primary"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marcar como solução
                </Button>
              )}

              {user?.id === reply.user_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(reply.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <p className="whitespace-pre-wrap">{reply.content}</p>
        </CardContent>

        <CardFooter className="pt-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1', reply.user_liked && 'text-destructive')}
            onClick={() => onLike(reply)}
          >
            <Heart className={cn('h-4 w-4', reply.user_liked && 'fill-current')} />
            {reply.likes_count}
          </Button>
          {depth < maxDepth && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => onReply(reply.id, reply.author?.full_name || 'Usuário')}
            >
              <Reply className="h-4 w-4" />
              Responder
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Nested replies */}
      {reply.replies && reply.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {reply.replies.map((nestedReply) => (
            <ReplyCard
              key={nestedReply.id}
              reply={nestedReply}
              postId={postId}
              isPostOwner={isPostOwner}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
              onMarkAsSolution={onMarkAsSolution}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PostDetailProps {
  post: ForumPost;
  replies: ForumReply[];
  onBack: () => void;
  onEdit: () => void;
}

export function PostDetail({ post, replies, onBack, onEdit }: PostDetailProps) {
  const { user } = useAuth();
  const {
    togglePostLike,
    toggleReplyLike,
    createReply,
    deletePost,
    deleteReply,
    markAsSolution,
  } = useForum();
  const { lightTap, mediumTap, success } = useHaptic();
  

  const [replyContent, setReplyContent] = useState('');
  const [showDeletePostDialog, setShowDeletePostDialog] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<{ id: string; postId: string } | null>(null);
  const [editingReply, setEditingReply] = useState<{ id: string; content: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);

  const isOwner = user?.id === post.user_id;

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;

    lightTap();
    await createReply.mutateAsync({
      post_id: post.id,
      content: replyContent,
      parent_reply_id: replyingTo?.id,
    });
    setReplyContent('');
    setReplyingTo(null);
  };

  const handleLikePost = () => {
    lightTap();
    togglePostLike.mutate({ postId: post.id, isLiked: post.user_liked || false });
  };

  const handleLikeReply = (reply: ForumReply) => {
    lightTap();
    toggleReplyLike.mutate({
      replyId: reply.id,
      postId: post.id,
      isLiked: reply.user_liked || false,
    });
  };

  const handleDeletePost = () => {
    mediumTap();
    deletePost.mutate(post.id);
    setShowDeletePostDialog(false);
    onBack();
  };

  const handleDeleteReply = () => {
    if (!replyToDelete) return;
    mediumTap();
    deleteReply.mutate(replyToDelete);
    setReplyToDelete(null);
  };

  const handleMarkAsSolution = (replyId: string) => {
    success();
    markAsSolution.mutate({ replyId, postId: post.id });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      {/* Main Post */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.author?.avatar_url || ''} />
                <AvatarFallback>
                  {post.author?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{post.author?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
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

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setShowDeletePostDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <h2 className="text-xl font-bold mb-3">{post.title}</h2>
          <p className="whitespace-pre-wrap">{post.content}</p>

          {/* Image attachment */}
          {post.image_url && (
            <div className="mt-4 rounded-lg overflow-hidden">
              <img
                src={post.image_url}
                alt=""
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}

          {/* PDF attachment */}
          {post.attachment_type === 'application/pdf' && post.attachment_url && (
            <div className="mt-4">
              <a
                href={post.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Documento PDF</p>
                  <p className="text-xs text-muted-foreground">Clique para visualizar</p>
                </div>
                <Download className="h-5 w-5 text-muted-foreground" />
              </a>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn('gap-1', post.user_liked && 'text-red-500')}
              onClick={handleLikePost}
            >
              <Heart className={cn('h-4 w-4', post.user_liked && 'fill-current')} />
              {post.likes_count}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              {replies.length}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Separator />

      {/* Reply Input */}
      <div className="space-y-2">
        {replyingTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
            <CornerDownRight className="h-4 w-4" />
            <span>Respondendo a <strong>{replyingTo.authorName}</strong></span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-auto"
              onClick={() => setReplyingTo(null)}
            >
              Cancelar
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder={replyingTo ? `Responder a ${replyingTo.authorName}...` : "Escreva sua resposta..."}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={handleSubmitReply}
            disabled={!replyContent.trim() || createReply.isPending}
            className="self-end"
          >
            {createReply.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">
          Respostas ({replies.length})
        </h3>

        {replies.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma resposta ainda. Seja o primeiro a responder!
          </p>
        ) : (
          replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              postId={post.id}
              isPostOwner={isOwner}
              onReply={(replyId, authorName) => setReplyingTo({ id: replyId, authorName })}
              onDelete={(replyId) => setReplyToDelete({ id: replyId, postId: post.id })}
              onLike={handleLikeReply}
              onMarkAsSolution={handleMarkAsSolution}
              depth={0}
            />
          ))
        )}
      </div>

      {/* Delete Post Dialog */}
      <AlertDialog open={showDeletePostDialog} onOpenChange={setShowDeletePostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post e todas as respostas serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reply Dialog */}
      <AlertDialog open={!!replyToDelete} onOpenChange={() => setReplyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReply} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
