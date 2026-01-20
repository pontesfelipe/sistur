import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export interface ReportPostData {
  post_id: string;
  reply_id?: string;
  reason: string;
  comment?: string;
}

export interface ForumPost {
  id: string;
  user_id: string;
  org_id: string;
  title: string;
  content: string;
  visibility: 'org' | 'public';
  image_url: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  category: string;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  user_liked?: boolean;
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_solution: boolean;
  likes_count: number;
  parent_reply_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
  user_liked?: boolean;
  replies?: ForumReply[];
}

export interface CreatePostData {
  title: string;
  content: string;
  visibility: 'org' | 'public';
  image_url?: string;
  attachment_url?: string;
  attachment_type?: string;
  category?: string;
}

export interface CreateReplyData {
  post_id: string;
  content: string;
  parent_reply_id?: string;
}

export function useForum() {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'org' | 'public'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch posts
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['forum-posts', filter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('forum_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (filter === 'org' && profile?.org_id) {
        query = query.eq('visibility', 'org').eq('org_id', profile.org_id);
      } else if (filter === 'public') {
        query = query.eq('visibility', 'public');
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author info and likes for each post
      const postsWithAuthors = await Promise.all(
        (data || []).map(async (post) => {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          let userLiked = false;
          if (user) {
            const { data: likeData } = await supabase
              .from('forum_post_likes')
              .select('post_id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
            userLiked = !!likeData;
          }

          return {
            ...post,
            author: authorData || { full_name: 'Usuário', avatar_url: null },
            user_liked: userLiked,
          } as ForumPost;
        })
      );

      return postsWithAuthors;
    },
    enabled: !!user,
  });

  // Fetch single post with replies
  const usePost = (postId: string) => {
    return useQuery({
      queryKey: ['forum-post', postId],
      queryFn: async () => {
        const { data: post, error } = await supabase
          .from('forum_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) throw error;

        const { data: authorData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', post.user_id)
          .single();

        let userLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('forum_post_likes')
            .select('post_id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
          userLiked = !!likeData;
        }

        return {
          ...post,
          author: authorData || { full_name: 'Usuário', avatar_url: null },
          user_liked: userLiked,
        } as ForumPost;
      },
      enabled: !!postId && !!user,
    });
  };

  // Fetch replies for a post (with nested replies)
  const useReplies = (postId: string) => {
    return useQuery({
      queryKey: ['forum-replies', postId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('forum_replies')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const repliesWithAuthors = await Promise.all(
          (data || []).map(async (reply) => {
            const { data: authorData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', reply.user_id)
              .single();

            let userLiked = false;
            if (user) {
              const { data: likeData } = await supabase
                .from('forum_reply_likes')
                .select('reply_id')
                .eq('reply_id', reply.id)
                .eq('user_id', user.id)
                .maybeSingle();
              userLiked = !!likeData;
            }

            return {
              ...reply,
              author: authorData || { full_name: 'Usuário', avatar_url: null },
              user_liked: userLiked,
            } as ForumReply;
          })
        );

        // Organize into nested structure
        const topLevelReplies: ForumReply[] = [];
        const replyMap = new Map<string, ForumReply>();

        // First pass: create map
        repliesWithAuthors.forEach((reply) => {
          replyMap.set(reply.id, { ...reply, replies: [] });
        });

        // Second pass: organize hierarchy
        repliesWithAuthors.forEach((reply) => {
          const replyWithChildren = replyMap.get(reply.id)!;
          if (reply.parent_reply_id) {
            const parent = replyMap.get(reply.parent_reply_id);
            if (parent) {
              parent.replies = parent.replies || [];
              parent.replies.push(replyWithChildren);
            } else {
              topLevelReplies.push(replyWithChildren);
            }
          } else {
            topLevelReplies.push(replyWithChildren);
          }
        });

        // Sort: solutions first, then by date
        topLevelReplies.sort((a, b) => {
          if (a.is_solution && !b.is_solution) return -1;
          if (!a.is_solution && b.is_solution) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        return topLevelReplies;
      },
      enabled: !!postId && !!user,
    });
  };

  // Create post
  const createPost = useMutation({
    mutationFn: async (data: CreatePostData) => {
      if (!user || !profile?.org_id) throw new Error('Usuário não autenticado');

      const { data: post, error } = await supabase
        .from('forum_posts')
        .insert({
          user_id: user.id,
          org_id: profile.org_id,
          title: data.title,
          content: data.content,
          visibility: data.visibility,
          image_url: data.image_url || null,
          attachment_url: data.attachment_url || null,
          attachment_type: data.attachment_type || null,
          category: data.category || 'general',
        })
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Post criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar post: ' + error.message);
    },
  });

  // Update post
  const updatePost = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreatePostData> & { id: string }) => {
      const { data: post, error } = await supabase
        .from('forum_posts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', variables.id] });
      toast.success('Post atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar post: ' + error.message);
    },
  });

  // Delete post
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Post excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir post: ' + error.message);
    },
  });

  // Create reply
  const createReply = useMutation({
    mutationFn: async (data: CreateReplyData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: reply, error } = await supabase
        .from('forum_replies')
        .insert({
          post_id: data.post_id,
          user_id: user.id,
          content: data.content,
          parent_reply_id: data.parent_reply_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return reply;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', variables.post_id] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Resposta enviada!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar resposta: ' + error.message);
    },
  });

  // Update reply
  const updateReply = useMutation({
    mutationFn: async ({ id, postId, content }: { id: string; postId: string; content: string }) => {
      const { data: reply, error } = await supabase
        .from('forum_replies')
        .update({ content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return reply;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', variables.postId] });
      toast.success('Resposta atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar resposta: ' + error.message);
    },
  });

  // Delete reply
  const deleteReply = useMutation({
    mutationFn: async ({ id, postId }: { id: string; postId: string }) => {
      const { error } = await supabase
        .from('forum_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Resposta excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir resposta: ' + error.message);
    },
  });

  // Toggle post like
  const togglePostLike = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');

      if (isLiked) {
        const { error } = await supabase
          .from('forum_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('forum_post_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', variables.postId] });
    },
  });

  // Toggle reply like
  const toggleReplyLike = useMutation({
    mutationFn: async ({ replyId, postId, isLiked }: { replyId: string; postId: string; isLiked: boolean }) => {
      if (!user) throw new Error('Usuário não autenticado');

      if (isLiked) {
        const { error } = await supabase
          .from('forum_reply_likes')
          .delete()
          .eq('reply_id', replyId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('forum_reply_likes')
          .insert({ reply_id: replyId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', variables.postId] });
    },
  });

  // Mark reply as solution
  const markAsSolution = useMutation({
    mutationFn: async ({ replyId, postId }: { replyId: string; postId: string }) => {
      // First, unmark any existing solution
      await supabase
        .from('forum_replies')
        .update({ is_solution: false })
        .eq('post_id', postId);

      // Then mark the new solution
      const { error } = await supabase
        .from('forum_replies')
        .update({ is_solution: true })
        .eq('id', replyId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', variables.postId] });
      toast.success('Resposta marcada como solução!');
    },
  });

  // Report a post or reply
  const reportPost = useMutation({
    mutationFn: async (data: ReportPostData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('forum_post_reports')
        .insert({
          post_id: data.post_id,
          reply_id: data.reply_id || null,
          user_id: user.id,
          reason: data.reason,
          comment: data.comment || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Denúncia enviada. Nossa equipe irá analisar.');
    },
    onError: (error) => {
      toast.error('Erro ao enviar denúncia: ' + error.message);
    },
  });

  return {
    posts,
    postsLoading,
    refetchPosts,
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    usePost,
    useReplies,
    createPost,
    updatePost,
    deletePost,
    createReply,
    updateReply,
    deleteReply,
    togglePostLike,
    toggleReplyLike,
    markAsSolution,
    reportPost,
  };
}
