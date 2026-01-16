import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseSecureVideoUrlOptions {
  /** Path to the video in storage (e.g., "training-id/video.mp4") */
  videoPath?: string;
  /** URL that might be a direct storage URL or external URL */
  videoUrl?: string;
  /** Provider type to determine if we need signed URLs */
  videoProvider?: 'supabase' | 'youtube' | 'vimeo' | 'mux';
  /** Expiration time in seconds (default: 300 = 5 minutes) */
  expiresIn?: number;
  /** Whether to auto-refresh before expiration */
  autoRefresh?: boolean;
}

interface SecureVideoUrlResult {
  url: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get secure, time-limited URLs for videos stored in Supabase Storage.
 * 
 * For Supabase-hosted videos:
 * - Generates signed URLs that expire after a configurable time
 * - Auto-refreshes before expiration if enabled
 * - Requires user authentication
 * 
 * For external providers (YouTube, Vimeo):
 * - Returns the original URL unchanged
 */
export function useSecureVideoUrl({
  videoPath,
  videoUrl,
  videoProvider = 'supabase',
  expiresIn = 300, // 5 minutes default
  autoRefresh = true,
}: UseSecureVideoUrlOptions): SecureVideoUrlResult {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // For external providers, return the URL directly
  const isExternalProvider = videoProvider === 'youtube' || videoProvider === 'vimeo';

  // Extract path from Supabase storage URL if needed
  const getStoragePath = (): string | null => {
    if (videoPath) return videoPath;
    
    if (videoUrl && videoProvider === 'supabase') {
      // Try to extract path from public URL
      // Format: https://[project].supabase.co/storage/v1/object/public/edu-videos/[path]
      const match = videoUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/edu-videos\/(.+)/);
      if (match) return decodeURIComponent(match[1]);
      
      // Or it might be a direct path already
      if (!videoUrl.startsWith('http')) return videoUrl;
    }
    
    return null;
  };

  const generateSignedUrl = async () => {
    // External providers don't need signed URLs
    if (isExternalProvider) {
      setUrl(videoUrl || null);
      return;
    }

    const path = getStoragePath();
    
    if (!path) {
      setUrl(videoUrl || null);
      return;
    }

    // Require authentication for signed URLs
    if (!user) {
      setError(new Error('Autenticação necessária para acessar o vídeo'));
      setUrl(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signError } = await supabase.storage
        .from('edu-videos')
        .createSignedUrl(path, expiresIn);

      if (signError) {
        throw signError;
      }

      if (data?.signedUrl) {
        setUrl(data.signedUrl);
        setExpiresAt(Date.now() + (expiresIn * 1000));
      }
    } catch (err) {
      console.error('Error generating signed URL:', err);
      setError(err as Error);
      // Fall back to original URL if available
      setUrl(videoUrl || null);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    await generateSignedUrl();
  };

  // Initial URL generation
  useEffect(() => {
    generateSignedUrl();
  }, [videoPath, videoUrl, videoProvider, user?.id]);

  // Auto-refresh before expiration
  useEffect(() => {
    if (!autoRefresh || isExternalProvider || !expiresAt) return;

    // Refresh 30 seconds before expiration
    const refreshTime = expiresAt - Date.now() - 30000;
    
    if (refreshTime <= 0) return;

    const timeout = setTimeout(() => {
      generateSignedUrl();
    }, refreshTime);

    return () => clearTimeout(timeout);
  }, [expiresAt, autoRefresh, isExternalProvider]);

  return {
    url: isExternalProvider ? (videoUrl || null) : url,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Simple utility to check if a URL is a Supabase storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage') || url.includes('supabase.in/storage');
}

/**
 * Get storage path from a Supabase URL
 */
export function getStoragePathFromUrl(url: string, bucket = 'edu-videos'): string | null {
  const regex = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)`);
  const match = url.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}
