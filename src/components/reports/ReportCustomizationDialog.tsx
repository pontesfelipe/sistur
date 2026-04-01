import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export interface ReportCustomization {
  logoUrl: string | null;
  headerText: string;
  footerText: string;
  organizationName: string;
  showDate: boolean;
  showPageNumbers: boolean;
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large';
  additionalNotes: string;
}

const DEFAULT_CUSTOMIZATION: ReportCustomization = {
  logoUrl: null,
  headerText: 'SISTUR — Relatório de Diagnóstico',
  footerText: '',
  organizationName: '',
  showDate: true,
  showPageNumbers: true,
  primaryColor: '#1E40AF',
  fontSize: 'medium',
  additionalNotes: '',
};

const STORAGE_KEY = 'sistur-report-customization';

function loadCustomization(): ReportCustomization {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CUSTOMIZATION, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_CUSTOMIZATION };
}

function saveCustomization(c: ReportCustomization) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (customization: ReportCustomization) => void;
}

export function ReportCustomizationDialog({ open, onOpenChange, onApply }: Props) {
  const [config, setConfig] = useState<ReportCustomization>(loadCustomization);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setConfig(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    saveCustomization(config);
    onApply(config);
    onOpenChange(false);
    toast.success('Personalização salva!');
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CUSTOMIZATION });
    localStorage.removeItem(STORAGE_KEY);
    toast.info('Personalização restaurada ao padrão');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Personalizar Relatório
          </DialogTitle>
          <DialogDescription>
            Configure logo, cabeçalho, rodapé e aparência dos relatórios exportados
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-6 py-2">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Logo da Organização</Label>
              <div className="flex items-center gap-3">
                {config.logoUrl ? (
                  <div className="relative h-16 w-32 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0 h-5 w-5"
                      onClick={() => setConfig(prev => ({ ...prev, logoUrl: null }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="h-16 w-32 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {config.logoUrl && (
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" />
                    Trocar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG ou JPG, máx. 2MB. Aparece no cabeçalho do Word e PDF.</p>
            </div>

            <Separator />

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Nome da Organização</Label>
              <Input
                id="orgName"
                placeholder="Ex: Secretaria Municipal de Turismo"
                value={config.organizationName}
                onChange={(e) => setConfig(prev => ({ ...prev, organizationName: e.target.value }))}
              />
            </div>

            {/* Header */}
            <div className="space-y-2">
              <Label htmlFor="headerText">Texto do Cabeçalho</Label>
              <Input
                id="headerText"
                placeholder="Texto exibido no topo de cada página"
                value={config.headerText}
                onChange={(e) => setConfig(prev => ({ ...prev, headerText: e.target.value }))}
              />
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <Label htmlFor="footerText">Texto do Rodapé</Label>
              <Input
                id="footerText"
                placeholder="Ex: Documento confidencial — Uso interno"
                value={config.footerText}
                onChange={(e) => setConfig(prev => ({ ...prev, footerText: e.target.value }))}
              />
            </div>

            <Separator />

            {/* Appearance */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold">Aparência</Label>

              <div className="flex items-center justify-between">
                <Label htmlFor="primaryColor" className="text-sm">Cor primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-8 w-10 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{config.primaryColor}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Tamanho da fonte</Label>
                <Select
                  value={config.fontSize}
                  onValueChange={(v) => setConfig(prev => ({ ...prev, fontSize: v as any }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequena</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showDate" className="text-sm">Exibir data de geração</Label>
                <Switch
                  id="showDate"
                  checked={config.showDate}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, showDate: v }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showPageNumbers" className="text-sm">Exibir número de páginas</Label>
                <Switch
                  id="showPageNumbers"
                  checked={config.showPageNumbers}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, showPageNumbers: v }))}
                />
              </div>
            </div>

            <Separator />

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Notas adicionais (rodapé do relatório)</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Ex: Este relatório é parte do plano estratégico 2025-2028..."
                value={config.additionalNotes}
                rows={3}
                onChange={(e) => setConfig(prev => ({ ...prev, additionalNotes: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Adicionado como bloco final antes do rodapé.</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
            Restaurar padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleApply}>Salvar Personalização</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { loadCustomization };
