import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileGameDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function MobileGameDrawer({ open, onClose, title, children }: MobileGameDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col">
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          <h3 className="font-bold text-sm">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground text-xs px-2 py-1">✕</button>
        </div>
        <div className="px-4 pb-4 overflow-y-auto flex-1 scroll-momentum">
          {children}
        </div>
      </div>
    </div>
  );
}
