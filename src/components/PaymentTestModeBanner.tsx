const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        A contratação online ainda não está ativa neste ambiente.
      </div>
    );
  }
  if (clientToken.startsWith('pk_test_')) {
    return (
      <div className="w-full rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
        Ambiente de teste: nenhum pagamento real é processado.
      </div>
    );
  }
  return null;
}
