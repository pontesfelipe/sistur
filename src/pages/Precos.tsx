import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { PlanCatalog } from '@/components/subscription/PlanCatalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, MapPin } from 'lucide-react';

const leadSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  email: z.string().email('Informe um e-mail válido'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  message: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

/**
 * Página pública de preços (/planos).
 * Catálogo oficial + formulário de interesse (leads comerciais).
 */
export default function Precos() {
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ code: string; name: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: '', email: '', phone: '', organization: '', message: '' },
  });

  const handleSelectPlan = (plan: { code: string; name: string }) => {
    setSelectedPlan(plan);
    setSubmitted(false);
    setLeadDialogOpen(true);
  };

  const onSubmit = async (values: LeadFormValues) => {
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('comercial_leads').insert({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        organization: values.organization || null,
        interested_plan: selectedPlan?.name ?? null,
        message: values.message || null,
      });
      if (error) throw error;
      setSubmitted(true);
      form.reset();
    } catch (err) {
      console.error('Erro ao enviar interesse:', err);
      toast.error('Não foi possível enviar. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            SISTUR
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Começar teste gratuito</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        <section className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Planos para cada perfil do turismo
          </h1>
          <p className="text-muted-foreground">
            Diagnósticos sistêmicos, formação certificada e o Professor Beni — do município
            ao empreendimento. Comece com o teste gratuito: curso base, 10 perguntas ao Beni
            e 1 diagnóstico de experimentação.
          </p>
        </section>

        <PlanCatalog onSelectPlan={handleSelectPlan} />

        <section className="text-center text-sm text-muted-foreground">
          <p>
            Gestão pública (plano Territorial): contratação por contrato/empenho —{' '}
            <button
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => handleSelectPlan({ code: 'territorial', name: 'Territorial' })}
            >
              fale com o time
            </button>
            .
          </p>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        SISTUR — Sistema Integrado de Suporte para Turismo em Regiões
      </footer>

      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? `Interesse no plano ${selectedPlan.name}` : 'Fale com o time'}
            </DialogTitle>
            <DialogDescription>
              Deixe seus dados e retornamos com a proposta ideal para o seu caso.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <p className="font-semibold">Recebemos seu interesse!</p>
              <p className="text-sm text-muted-foreground">
                Nossa equipe entra em contato pelo e-mail informado.
              </p>
              <Button variant="outline" onClick={() => setLeadDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="voce@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organização (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Prefeitura, empresa..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Conte um pouco do seu contexto..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar interesse
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
