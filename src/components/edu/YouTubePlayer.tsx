import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize,
  SkipBack,
  SkipForward,
  Loader2
} from 'lucide-react';

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YouTubePlayerProps {
  videoUrl: string;
  trainingId?: string;
  trailId?: string;
  onProgress?: (percent: number, seconds: number) => void;
  onComplete?: () => void;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return match ? match[1] : null;
}

// Load YouTube IFrame API script
let apiLoadPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;
  
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  
  apiLoadPromise = new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
    
    document.head.appendChild(tag);
  });
  
  return apiLoadPromise;
}

export function YouTubePlayer({
  videoUrl,
  trainingId,
  trailId,
  onProgress,
  onComplete,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerIdRef = useRef(`yt-player-${Date.now()}`);
  const progressIntervalRef = useRef<number | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const videoId = extractYouTubeId(videoUrl);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Update progress periodically
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      if (playerRef.current) {
        const current = playerRef.current.getCurrentTime();
        const total = playerRef.current.getDuration();
        
        if (total > 0) {
          const percent = (current / total) * 100;
          setCurrentTime(current);
          setProgress(percent);
          
          if (onProgress && Math.floor(current) % 5 === 0) {
            onProgress(percent, Math.floor(current));
          }
        }
      }
    }, 500);
  }, [onProgress]);
  
  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);
  
  // Initialize player
  useEffect(() => {
    if (!videoId) return;
    
    let mounted = true;
    
    const initPlayer = async () => {
      await loadYouTubeAPI();
      
      if (!mounted || !containerRef.current) return;
      
      // Create player container div
      const playerDiv = document.createElement('div');
      playerDiv.id = playerIdRef.current;
      containerRef.current.appendChild(playerDiv);
      
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,           // Hide YouTube controls
          disablekb: 1,          // Disable keyboard controls
          fs: 0,                 // Hide fullscreen button
          iv_load_policy: 3,     // Hide annotations
          modestbranding: 1,     // Reduce branding
          rel: 0,                // Don't show related videos
          showinfo: 0,           // Hide video info
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (!mounted) return;
            setIsReady(true);
            setIsLoading(false);
            setDuration(event.target.getDuration());
            setVolume(event.target.getVolume());
            setIsMuted(event.target.isMuted());
          },
          onStateChange: (event) => {
            if (!mounted) return;
            
            const state = event.data;
            
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setIsLoading(false);
              startProgressTracking();
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopProgressTracking();
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopProgressTracking();
              onComplete?.();
            } else if (state === window.YT.PlayerState.BUFFERING) {
              setIsLoading(true);
            }
          },
          onError: (event) => {
            console.error('YouTube player error:', event.data);
            setIsLoading(false);
          },
        },
      });
    };
    
    initPlayer();
    
    return () => {
      mounted = false;
      stopProgressTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, startProgressTracking, stopProgressTracking, onComplete]);
  
  // Player controls
  const togglePlay = () => {
    if (!playerRef.current || !isReady) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };
  
  const toggleMute = () => {
    if (!playerRef.current || !isReady) return;
    
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current || !isReady) return;
    
    const newVolume = value[0];
    playerRef.current.setVolume(newVolume);
    setVolume(newVolume);
    
    if (newVolume === 0) {
      playerRef.current.mute();
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  };
  
  const handleSeek = (value: number[]) => {
    if (!playerRef.current || !isReady || duration === 0) return;
    
    const seekPercent = value[0];
    const seekTime = (seekPercent / 100) * duration;
    playerRef.current.seekTo(seekTime, true);
    setCurrentTime(seekTime);
    setProgress(seekPercent);
  };
  
  const skip = (seconds: number) => {
    if (!playerRef.current || !isReady) return;
    
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    playerRef.current.seekTo(newTime, true);
  };
  
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current.closest('.video-container');
    if (!container) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen?.();
    }
  };
  
  if (!videoId) {
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video bg-black flex items-center justify-center">
          <p className="text-white text-sm">URL de vídeo inválida</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden video-container">
      {/* Video container with overlay to block interactions */}
      <div 
        className="aspect-video relative bg-black overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* YouTube player container */}
        <div 
          ref={containerRef}
          className="absolute inset-0 pointer-events-none"
          style={{ 
            // Slightly scale up to hide any YouTube UI that might appear
            transform: 'scale(1.05)',
            transformOrigin: 'center center',
          }}
        />
        
        {/* Full overlay to block all interactions with iframe */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={togglePlay}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          </div>
        )}
        
        {/* Play button overlay when paused */}
        {!isPlaying && !isLoading && isReady && (
          <div 
            className="absolute inset-0 z-15 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors">
              <Play className="h-10 w-10 text-primary-foreground ml-1" />
            </div>
          </div>
        )}
      </div>
      
      {/* Custom controls below video */}
      <div className="bg-card border-t p-3 space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
            disabled={!isReady}
          />
          <span className="text-xs text-muted-foreground w-12">
            {formatTime(duration)}
          </span>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={togglePlay}
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            {/* Skip back */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => skip(-10)}
              disabled={!isReady}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            {/* Skip forward */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => skip(10)}
              disabled={!isReady}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Volume controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMute}
              disabled={!isReady}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
              disabled={!isReady}
            />
          </div>
          
          {/* Fullscreen */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleFullscreen}
            disabled={!isReady}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
