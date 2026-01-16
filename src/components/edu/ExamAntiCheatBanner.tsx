import { Shield, AlertTriangle, Eye, Clock, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface ExamAntiCheatBannerProps {
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  currentAttempt?: number;
  isProctored?: boolean;
}

export function ExamAntiCheatBanner({
  timeLimit = 60,
  maxAttempts = 1,
  currentAttempt = 1,
  isProctored = true,
}: ExamAntiCheatBannerProps) {
  return (
    <div className="space-y-4">
      <Alert className="border-primary/50 bg-primary/5">
        <Shield className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary font-semibold">
          Sistema Anti-Fraude Ativado
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Este exame utiliza mecanismos de proteção para garantir a integridade da avaliação.
          Suas respostas são verificadas e comportamentos suspeitos são registrados.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Tempo Limite</p>
            <p className="font-semibold">{timeLimit} minutos</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Tentativas</p>
            <p className="font-semibold">{currentAttempt} de {maxAttempts}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Questões</p>
            <p className="font-semibold">Randomizadas</p>
          </div>
        </div>

        {isProctored && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Monitoramento</p>
              <p className="font-semibold">Ativo</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-amber-700">Regras do Exame:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-600/80">
              <li>Não saia da página durante o exame</li>
              <li>Não use Ctrl+C/Ctrl+V ou prints</li>
              <li>Cada questão só pode ser respondida uma vez</li>
              <li>O tempo é contado mesmo que você saia da página</li>
              <li>Questões são sorteadas aleatoriamente para cada candidato</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
