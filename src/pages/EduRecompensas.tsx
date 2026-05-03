import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useMyXP } from '@/hooks/useGamification';
import { useRewards, useEquipReward } from '@/hooks/useRewards';
import { useMemo } from 'react';

export default function EduRecompensas() {
  const { data: xp, isLoading: xpLoading } = useMyXP();
  const { data: rewards, isLoading } = useRewards();
  const equip = useEquipReward();

  const level = xp?.level ?? 1;
  const equippedAvatar = (xp as any)?.equipped_avatar as string | undefined;
  const equippedTheme = (xp as any)?.equipped_theme as string | undefined;

  const { avatars, themes } = useMemo(() => {
    const r = rewards ?? [];
    return {
      avatars: r.filter((x) => x.type === 'avatar'),
      themes: r.filter((x) => x.type === 'theme'),
    };
  }, [rewards]);

  const renderGrid = (items: typeof avatars, type: 'avatar' | 'theme') => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((r) => {
        const unlocked = level >= r.unlock_level;
        const equipped = type === 'avatar' ? equippedAvatar === r.code : equippedTheme === r.code;
        return (
          <Card key={r.id} className={equipped ? 'border-primary bg-primary/5' : unlocked ? '' : 'opacity-60'}>
            <CardContent className="p-4 text-center space-y-2">
              <div className="text-5xl">
                {type === 'avatar' ? r.value : '🎨'}
              </div>
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.description}</div>
              {unlocked ? (
                equipped ? (
                  <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Em uso</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => equip.mutate({ type, code: r.code })} disabled={equip.isPending}>
                    {type === 'avatar' ? 'Equipar' : 'Aplicar'}
                  </Button>
                )
              ) : (
                <Badge variant="secondary" className="gap-1"><Lock className="w-3 h-3" /> Nível {r.unlock_level}</Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <AppLayout title="Recompensas" subtitle="Avatares e temas desbloqueáveis pelo seu progresso">
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Recompensas</h1>
            <p className="text-sm text-muted-foreground">
              {xpLoading ? 'Carregando...' : `Você está no nível ${level} — desbloqueie itens conforme evolui.`}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avatares</CardTitle>
            <CardDescription>Personalize sua identidade no EDU</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : renderGrid(avatars, 'avatar')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temas</CardTitle>
            <CardDescription>Visual da sua jornada de aprendizado</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : renderGrid(themes, 'theme')}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}