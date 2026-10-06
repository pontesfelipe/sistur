import { useState } from 'react';
import { AlertCircle, Video } from 'lucide-react';
import { tx } from '@/i18n/t';

interface TutorialVideoProps {
  src: string;
  title: string;
}

export function TutorialVideo({ src, title }: TutorialVideoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="flex items-center gap-2 text-lg font-display font-semibold text-foreground">
        <Video className="h-5 w-5 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        className="aspect-video w-full rounded-lg border border-border bg-muted object-contain"
        onError={() => setFailed(true)}
        onLoadedMetadata={() => setFailed(false)}
      />
      {failed && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {tx('Não foi possível carregar o vídeo. Tente novamente mais tarde.')}
        </p>
      )}
    </section>
  );
}