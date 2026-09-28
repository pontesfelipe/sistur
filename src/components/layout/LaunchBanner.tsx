import { Rocket } from 'lucide-react';

export function LaunchBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Lançamento</p>
          <p className="font-display text-lg font-semibold leading-tight">Em breve: lançamento oficial da plataforma</p>
          <p className="text-sm text-white/80 mt-0.5">Estamos finalizando os últimos ajustes para você aproveitar tudo o que o SISTUR preparou.</p>
        </div>
      </div>
    </div>
  );
}
