import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

type Pillar = 'RA' | 'OE' | 'AO';
type Direction = 'HIGH_IS_BETTER' | 'LOW_IS_BETTER';
type Normalization = 'MIN_MAX' | 'BANDS' | 'BINARY';
type DiagnosisTier = 'SMALL' | 'MEDIUM' | 'COMPLETE';
type IndicatorScope = 'territorial' | 'enterprise' | 'both';

interface IndicatorFormData {
  code: string;
  name: string;
  pillar: Pillar;
  theme: string;
  description: string;
  unit: string;
  direction: Direction;
  normalization: Normalization;
  min_ref: number | null;
  max_ref: number | null;
  weight: number;
  minimum_tier: DiagnosisTier;
  indicator_scope: IndicatorScope;
}

interface IndicatorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IndicatorFormData) => Promise<void>;
  isLoading?: boolean;
}

const defaultFormData: IndicatorFormData = {
  code: '',
  name: '',
  pillar: 'RA',
  theme: '',
  description: '',
  unit: '',
  direction: 'HIGH_IS_BETTER',
  normalization: 'MIN_MAX',
  min_ref: null,
  max_ref: null,
  weight: 0.05,
  minimum_tier: 'COMPLETE',
  indicator_scope: 'territorial',
};

export function IndicatorFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: IndicatorFormDialogProps) {
  const [formData, setFormData] = useState<IndicatorFormData>(defaultFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData(defaultFormData);
  };

  const handleChange = (field: keyof IndicatorFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Indicador</DialogTitle>
          <DialogDescription>
            Cadastre um novo indicador para o sistema de diagnóstico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="Ex: RA001"
                required
              />
            </div>

            {/* Pillar */}
            <div className="space-y-2">
              <Label htmlFor="pillar">Pilar *</Label>
              <Select
                value={formData.pillar}
                onValueChange={(value) => handleChange('pillar', value as Pillar)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RA">I-RA - Relações Ambientais</SelectItem>
                  <SelectItem value="OE">I-OE - Organização Estrutural</SelectItem>
                  <SelectItem value="AO">I-AO - Ações Operacionais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nome do indicador"
              required
            />
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme">Tema *</Label>
            <Input
              id="theme"
              value={formData.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              placeholder="Ex: Saneamento, Segurança, Infraestrutura"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descrição detalhada do indicador"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="Ex: %, R$, hab"
              />
            </div>

            {/* Direction */}
            <div className="space-y-2">
              <Label htmlFor="direction">Direção</Label>
              <Select
                value={formData.direction}
                onValueChange={(value) => handleChange('direction', value as Direction)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH_IS_BETTER">↑ Maior é melhor</SelectItem>
                  <SelectItem value="LOW_IS_BETTER">↓ Menor é melhor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Normalization */}
            <div className="space-y-2">
              <Label htmlFor="normalization">Normalização</Label>
              <Select
                value={formData.normalization}
                onValueChange={(value) => handleChange('normalization', value as Normalization)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIN_MAX">Min-Max</SelectItem>
                  <SelectItem value="BANDS">Faixas</SelectItem>
                  <SelectItem value="BINARY">Binário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Min Ref */}
            <div className="space-y-2">
              <Label htmlFor="min_ref">Valor Mínimo</Label>
              <Input
                id="min_ref"
                type="number"
                step="any"
                value={formData.min_ref ?? ''}
                onChange={(e) => handleChange('min_ref', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0"
              />
            </div>

            {/* Max Ref */}
            <div className="space-y-2">
              <Label htmlFor="max_ref">Valor Máximo</Label>
              <Input
                id="max_ref"
                type="number"
                step="any"
                value={formData.max_ref ?? ''}
                onChange={(e) => handleChange('max_ref', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="100"
              />
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (%)</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                max="100"
                value={Math.round(formData.weight * 100)}
                onChange={(e) => handleChange('weight', parseFloat(e.target.value) / 100)}
                placeholder="5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tier */}
            <div className="space-y-2">
              <Label htmlFor="tier">Tier de Diagnóstico</Label>
              <Select
                value={formData.minimum_tier}
                onValueChange={(value) => handleChange('minimum_tier', value as DiagnosisTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMALL">Essencial</SelectItem>
                  <SelectItem value="MEDIUM">Estratégico</SelectItem>
                  <SelectItem value="COMPLETE">Integral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label htmlFor="scope">Escopo</Label>
              <Select
                value={formData.indicator_scope}
                onValueChange={(value) => handleChange('indicator_scope', value as IndicatorScope)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="territorial">Territorial</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Indicador
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
