import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ForumNotification {
  id: string;
  type: 'new_post' | 'mention' | 'reply_to_post' | 'reply_to_reply';
  title: string;
  post_id: string;
  reply_id?: string;
  created_at: string;
}

export function useForumNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['forum-notifications', user?.id],
    queryFn: async () => {
      if (!user) return { unreadCount: 0, notifications: [] };

      // Get the user's last seen timestamp from localStorage
      const lastSeenKey = `forum_last_seen_${user.id}`;
      const lastSeenStr = localStorage.getItem(lastSeenKey);
      const lastSeen = lastSeenStr ? new Date(lastSeenStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago

      // Fetch new posts since last seen
      const { data: newPosts, error: postsError } = await supabase
        .from('forum_posts')
        .select('id, title, created_at')
        .gt('created_at', lastSeen.toISOString())
        .neq('user_id', user.id) // Exclude own posts
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) {
        console.error('Error fetching new posts:', postsError);
        return { unreadCount: 0, notifications: [] };
      }

      // Fetch replies to user's posts since last seen
      const { data: userPosts } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('user_id', user.id);

      const userPostIds = userPosts?.map(p => p.id) || [];

      let repliesToUserPosts: any[] = [];
      if (userPostIds.length > 0) {
        const { data: replies } = await supabase
          .from('forum_replies')
          .select('id, post_id, content, created_at')
          .in('post_id', userPostIds)
          .neq('user_id', user.id)
          .gt('created_at', lastSeen.toISOString())
          .order('created_at', { ascending: false })
          .limit(20);
        
        repliesToUserPosts = replies || [];
      }

      // Count mentions (@username pattern) - search in replies content
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      let mentionsCount = 0;
      if (profile?.full_name) {
        const mentionPattern = `@${profile.full_name}`;
        const { count } = await supabase
          .from('forum_replies')
          .select('id', { count: 'exact', head: true })
          .ilike('content', `%${mentionPattern}%`)
          .neq('user_id', user.id)
          .gt('created_at', lastSeen.toISOString());
        
        mentionsCount = count || 0;
      }

      const notifications: ForumNotification[] = [];

      // Add new posts notifications
      newPosts?.forEach((post) => {
        notifications.push({
          id: `post-${post.id}`,
          type: 'new_post',
          title: post.title,
          post_id: post.id,
          created_at: post.created_at,
        });
      });

      // Add replies to user's posts
      repliesToUserPosts.forEach((reply) => {
        notifications.push({
          id: `reply-${reply.id}`,
          type: 'reply_to_post',
          title: 'Nova resposta no seu post',
          post_id: reply.post_id,
          reply_id: reply.id,
          created_at: reply.created_at,
        });
      });

      // Calculate total unread count
      const unreadCount = (newPosts?.length || 0) + repliesToUserPosts.length + mentionsCount;

      return { 
        unreadCount, 
        notifications: notifications.slice(0, 20),
        newPostsCount: newPosts?.length || 0,
        repliesCount: repliesToUserPosts.length,
        mentionsCount,
      };
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useMarkForumAsSeen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const lastSeenKey = `forum_last_seen_${user.id}`;
      localStorage.setItem(lastSeenKey, new Date().toISOString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-notifications'] });
    },
  });
}
