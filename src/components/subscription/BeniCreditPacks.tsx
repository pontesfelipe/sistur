import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins } from 'lucide-react';

export interface BeniPack {
  priceId: string;
  name: string;
  credits: number;
  price: string;
  description: string;
}

export const BENI_PACKS: BeniPack[] = [
  { priceId: 'beni_pack_50', name: '50 perguntas', credits: 50, price: 'R$ 29,00', description: 'Créditos pessoais para o Professor Beni' },
  { priceId: 'beni_pack_150', name: '150 perguntas', credits: 150, price: 'R$ 69,00', description: 'Créditos pessoais com melhor custo por pergunta' },
  { priceId: 'beni_pack_org_500', name: '500 perguntas (organização)', credits: 500, price: 'R$ 199,00', description: 'Créditos compartilhados por toda a organização' },
];

interface BeniCreditPacksProps {
  onBuy: (pack: BeniPack) => void;
}

export function BeniCreditPacks({ onBuy }: BeniCreditPacksProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Coins className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Pacotes de créditos do Professor Beni</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Compra avulsa de perguntas adicionais, usadas quando a cota mensal do plano acabar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {BENI_PACKS.map((pack) => (
          <Card key={pack.priceId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{pack.name}</CardTitle>
              <CardDescription>{pack.description}</CardDescription>
              <p className="text-xl font-bold mt-2">{pack.price}</p>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => onBuy(pack)}>
                Comprar créditos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
