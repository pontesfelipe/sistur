-- Empresarial: R$ 59,00 por pessoa/mês (mantém cobrança por assento, mínimo 5)
update public.plans
set price_cents = 5900,
    description = 'Diagnóstico empresarial por empreendimento/marca. R$ 59 por pessoa/mês (mínimo 5 usuários).',
    version = version + 1,
    updated_at = now()
where code = 'empresarial';

-- Remover plano Independente (sem assinaturas vinculadas)
delete from public.plans where code = 'independente';