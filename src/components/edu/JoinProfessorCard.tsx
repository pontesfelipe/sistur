/**
 * Permite que um usuário já existente se vincule a um professor
 * informando (ou recebendo por link) o código de indicação.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, CheckCircle2 } from 'lucide-react';
import { useLinkStudentReferral, useMyProfessorLink } from '@/hooks/useProfessorReferral';

export function JoinProfessorCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  const [code, setCode] = useState(refParam ?? '');
  const [autoTried, setAutoTried] = useState(false);
  const link = useLinkStudentReferral();
  const { data: myLink, isLoading } = useMyProfessorLink();

  useEffect(() => {
    if (!refParam || autoTried || isLoading || myLink) return;
    setAutoTried(true);
    link.mutate(refParam, {
      onSettled: () => {
        searchParams.delete('ref');
        setSearchParams(searchParams, { replace: true });
      },
    });
  }, [refParam, autoTried, isLoading, myLink, link, searchParams, setSearchParams]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-5 w-5 text-primary" />
          Vínculo com professor
        </CardTitle>
        <CardDescription>
          Recebeu um código de um professor? Informe abaixo para entrar na lista de estudantes dele.
          Depois, o professor adiciona você às turmas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : myLink ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Vinculado
            </Badge>
            <span className="text-sm text-muted-foreground">
              {myLink.professor_name ? `Professor: ${myLink.professor_name}` : 'Você já está vinculado a um professor.'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex.: PROF3XK9AB"
              className="font-mono uppercase"
              maxLength={20}
            />
            <Button
              onClick={() => link.mutate(code.trim())}
              disabled={!code.trim() || link.isPending}
            >
              {link.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Vincular
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
