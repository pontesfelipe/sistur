import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="items-center text-center">
          {sessionId ? (
            <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
          ) : (
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
          )}
          <CardTitle>
            {sessionId ? 'Pagamento recebido' : 'Nenhuma informação de pagamento'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {sessionId
              ? 'Estamos confirmando sua contratação. O acesso é liberado automaticamente em alguns instantes.'
              : 'Não localizamos a sessão de pagamento. Se você concluiu uma compra, verifique sua assinatura.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild>
              <Link to="/assinatura">Ver minha assinatura</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Ir para o início</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
