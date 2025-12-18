import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export const SplashScreen = ({ onComplete, minDuration = 2000 }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gradient-hero transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Logo Container */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Logo Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-accent/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 bg-card rounded-2xl shadow-2xl flex items-center justify-center transform animate-[scale-in_0.6s_ease-out]">
            <svg
              viewBox="0 0 100 100"
              className="w-16 h-16 md:w-20 md:h-20"
              fill="none"
            >
              {/* Stylized S for SISTUR */}
              <path
                d="M70 25C70 25 60 20 50 20C35 20 25 30 25 40C25 55 45 55 50 60C55 65 35 65 35 75C35 85 45 90 55 90C65 90 75 85 75 85"
                stroke="hsl(187 65% 28%)"
                strokeWidth="8"
                strokeLinecap="round"
                className="animate-[draw-path_1.5s_ease-out_forwards]"
                style={{
                  strokeDasharray: 200,
                  strokeDashoffset: 200,
                }}
              />
              {/* Accent dot */}
              <circle
                cx="75"
                cy="25"
                r="6"
                fill="hsl(38 95% 50%)"
                className="animate-[fade-scale_0.5s_ease-out_1s_forwards]"
                style={{ opacity: 0 }}
              />
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex flex-col items-center gap-2 animate-[fade-up_0.6s_ease-out_0.3s_forwards]" style={{ opacity: 0 }}>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground tracking-tight">
            SISTUR
          </h1>
          <p className="text-primary-foreground/70 text-sm md:text-base font-medium tracking-widest uppercase">
            Sistema de Inteligência Territorial
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center gap-2 animate-[fade-up_0.6s_ease-out_0.6s_forwards]" style={{ opacity: 0 }}>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-accent rounded-full animate-[bounce_1s_ease-in-out_infinite]" />
            <span className="w-2 h-2 bg-accent rounded-full animate-[bounce_1s_ease-in-out_0.2s_infinite]" />
            <span className="w-2 h-2 bg-accent rounded-full animate-[bounce_1s_ease-in-out_0.4s_infinite]" />
          </div>
          <span className="text-primary-foreground/50 text-sm ml-2">Carregando...</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center animate-[fade-up_0.6s_ease-out_0.9s_forwards]" style={{ opacity: 0 }}>
        <p className="text-primary-foreground/40 text-xs">
          Transformando indicadores em decisões estratégicas
        </p>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes draw-path {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fade-scale {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
};
