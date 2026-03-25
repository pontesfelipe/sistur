import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, MailX } from 'lucide-react';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === false && data.reason === 'already_unsubscribed') setStatus('already');
        else if (data.valid) setStatus('valid');
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      setStatus(data?.success ? 'success' : 'error');
    } catch { setStatus('error'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <MailX className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <CardTitle>Cancelar inscrição</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
          {status === 'valid' && (
            <>
              <p className="text-muted-foreground">Deseja parar de receber e-mails do SISTUR?</p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar cancelamento
              </Button>
            </>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p>Inscrição cancelada com sucesso.</p>
            </div>
          )}
          {status === 'already' && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
              <p>Esta inscrição já foi cancelada anteriormente.</p>
            </div>
          )}
          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-8 w-8 text-destructive" />
              <p>Link inválido ou expirado.</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-8 w-8 text-destructive" />
              <p>Ocorreu um erro. Tente novamente mais tarde.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
