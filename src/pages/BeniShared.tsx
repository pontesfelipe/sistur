import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type Shared = { title: string; updated_at: string; messages: { role: string; content: string }[] };

export default function BeniShared() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Shared | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Conversa compartilhada — Professor Beni | SISTUR';
    supabase.rpc('get_shared_beni_conversation', { _token: token ?? '' }).then(({ data }) => {
      setData((data as unknown as Shared) ?? null);
      setLoading(false);
    });
  }, [token]);

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/" className="text-sm font-semibold text-primary">SISTUR</Link>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !data ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Este link não está disponível ou foi desativado.</CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{data.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Conversa com o Professor Beni · {new Date(data.updated_at).toLocaleDateString('pt-BR')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
