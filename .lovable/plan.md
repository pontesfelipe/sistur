# Reprecificação do plano Empresarial

## Objetivo
Fixar o plano Empresarial em **R$ 129 por usuário/mês**, com mínimo de **5 usuários**, e manter o desconto anual de **15%**: **R$ 1.315,80 por usuário/ano**.

## Alterações
- Atualizar os preços mensal e anual no provedor de pagamentos, preservando os identificadores usados pelo checkout.
- Atualizar o catálogo oficial no banco, incluindo descrição, mínimo de usuários e valores anual/mensal.
- Corrigir todas as referências exibidas no app, traduções e registros históricos que ainda mostrem R$ 59 ou R$ 601/ano.
- Manter a contratação Empresarial por assento e o limite operacional atual de até 100 usuários no checkout.
- Atualizar a versão para **2.37.1**, o changelog, a documentação comercial e a memória da regra de preço.

## Verificação
- Adicionar um teste da regra comercial com os valores exatos: R$ 129/mês, mínimo 5, R$ 1.315,80/ano e piso anual de R$ 6.579.
- Conferir o catálogo mensal e anual, o total para 5 usuários e a abertura do checkout.
- Rodar os testes relacionados e confirmar que a aplicação continua compilando sem erros.

## Observação
Assinaturas já existentes não terão o valor alterado retroativamente; a mudança valerá para novas contratações e trocas para o preço atualizado.