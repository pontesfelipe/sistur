import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { useEventMutations } from '@/hooks/useEduEnrollments';

interface VideoPlayerProps {
  videoUrl: string;
  videoProvider?: 'supabase' | 'youtube' | 'vimeo' | 'mux';
  trainingId?: string;
  trailId?: string;
  onProgress?: (percent: number, seconds: number) => void;
  onComplete?: () => void;
  freePreviewSeconds?: number;
  isEnrolled?: boolean;
}

export function VideoPlayer({
  videoUrl,
  videoProvider = 'supabase',
  trainingId,
  trailId,
  onProgress,
  onComplete,
  freePreviewSeconds = 0,
  isEnrolled = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPreviewBlock, setShowPreviewBlock] = useState(false);
  
  const { trackEvent } = useEventMutations();
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration;
      const percent = (current / total) * 100;
      
      setCurrentTime(current);
      setProgress(percent);
      
      // Check free preview limit
      if (!isEnrolled && freePreviewSeconds > 0 && current >= freePreviewSeconds) {
        video.pause();
        setIsPlaying(false);
        setShowPreviewBlock(true);
        return;
      }
      
      // Report progress
      if (onProgress && Math.floor(current) % 5 === 0) {
        onProgress(percent, Math.floor(current));
      }
      
      // Track milestone events
      if (percent >= 25 && percent < 26) {
        trackEvent.mutate({ 
          eventType: 'video_milestone_25', 
          trainingId, 
          trailId,
          eventValue: { percent: 25 }
        });
      } else if (percent >= 50 && percent < 51) {
        trackEvent.mutate({ 
          eventType: 'video_milestone_50', 
          trainingId, 
          trailId,
          eventValue: { percent: 50 }
        });
      } else if (percent >= 75 && percent < 76) {
        trackEvent.mutate({ 
          eventType: 'video_milestone_75', 
          trainingId, 
          trailId,
          eventValue: { percent: 75 }
        });
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      trackEvent.mutate({ 
        eventType: 'video_completed', 
        trainingId, 
        trailId 
      });
      onComplete?.();
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    const handlePlay = () => {
      trackEvent.mutate({ 
        eventType: 'video_play', 
        trainingId, 
        trailId,
        eventValue: { currentTime: video.currentTime }
      });
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
    };
  }, [trainingId, trailId, isEnrolled, freePreviewSeconds, onProgress, onComplete, trackEvent]);
  
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * duration;
    
    // Check preview limit
    if (!isEnrolled && freePreviewSeconds > 0 && seekTime >= freePreviewSeconds) {
      video.currentTime = freePreviewSeconds - 1;
      setShowPreviewBlock(true);
      return;
    }
    
    video.currentTime = seekTime;
  };
  
  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // For external providers (YouTube, Vimeo), render iframe
  if (videoProvider === 'youtube' || videoProvider === 'vimeo') {
    let embedUrl = videoUrl;
    
    if (videoProvider === 'youtube') {
      // Convert YouTube URL to embed
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (videoProvider === 'vimeo') {
      // Convert Vimeo URL to embed
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }
    }
    
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Card>
    );
  }
  
  // Native video player for supabase/mux
  return (
    <Card className="overflow-hidden relative group">
      <div className="aspect-video bg-black relative">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          onClick={togglePlay}
        />
        
        {/* Preview Block Overlay */}
        {showPreviewBlock && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center text-white p-6">
              <h3 className="text-xl font-semibold mb-2">Prévia gratuita encerrada</h3>
              <p className="text-sm text-gray-300 mb-4">
                Matricule-se para continuar assistindo
              </p>
              <Button variant="secondary">
                Matricular-se
              </Button>
            </div>
          </div>
        )}
        
        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <div 
            className="h-1.5 bg-white/30 rounded-full mb-3 cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3 text-white">
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => skip(-10)}>
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={() => skip(10)}>
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <div className="flex-1" />
            
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="text-white hover:text-white" onClick={toggleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
