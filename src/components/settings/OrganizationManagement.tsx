import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Users, 
  MapPin,
  Edit,
  Trash2,
  Loader2,
  Search,
  Landmark,
  Hotel,
  Sparkles
} from 'lucide-react';

type OrgType = 'PUBLIC' | 'PRIVATE';

interface Organization {
  id: string;
  name: string;
  org_type: OrgType | null;
  has_enterprise_access: boolean;
  created_at: string;
  user_count: number;
  destination_count: number;
}

export function OrganizationManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    org_type: 'PUBLIC' as OrgType,
    has_enterprise_access: false 
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      // Fetch organizations with counts including new fields
      const { data: orgs, error } = await supabase
        .from('orgs')
        .select('id, name, org_type, has_enterprise_access, created_at')
        .order('name');

      if (error) throw error;

      // Get user counts per org
      const { data: profiles } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('pending_approval', false);

      // Get destination counts per org
      const { data: destinations } = await supabase
        .from('destinations')
        .select('org_id');

      const userCounts = (profiles || []).reduce((acc, p) => {
        acc[p.org_id] = (acc[p.org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const destCounts = (destinations || []).reduce((acc, d) => {
        acc[d.org_id] = (acc[d.org_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrichedOrgs = (orgs || []).map(org => ({
        ...org,
        org_type: (org.org_type as OrgType) || 'PUBLIC',
        has_enterprise_access: org.has_enterprise_access || false,
        user_count: userCounts[org.id] || 0,
        destination_count: destCounts[org.id] || 0
      }));

      setOrganizations(enrichedOrgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Erro ao carregar organizações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        name: formData.name.trim(),
        org_type: formData.org_type,
        has_enterprise_access: formData.has_enterprise_access
      };

      if (editingOrg) {
        const { error } = await supabase
          .from('orgs')
          .update(updateData)
          .eq('id', editingOrg.id);

        if (error) throw error;
        toast.success('Organização atualizada');
      } else {
        const { error } = await supabase
          .from('orgs')
          .insert(updateData);

        if (error) throw error;
        toast.success('Organização criada');
      }

      setDialogOpen(false);
      resetFormData();
      setEditingOrg(null);
      await fetchOrganizations();
    } catch (error: any) {
      console.error('Error saving organization:', error);
      toast.error(error.message || 'Erro ao salvar organização');
    } finally {
      setSaving(false);
    }
  };

  const resetFormData = () => {
    setFormData({ name: '', org_type: 'PUBLIC', has_enterprise_access: false });
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ 
      name: org.name, 
      org_type: org.org_type || 'PUBLIC',
      has_enterprise_access: org.has_enterprise_access || false
    });
    setDialogOpen(true);
  };

  const handleDelete = async (orgId: string) => {
    try {
      const { error } = await supabase
        .from('orgs')
        .delete()
        .eq('id', orgId);

      if (error) throw error;
      toast.success('Organização excluída');
      await fetchOrganizations();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast.error(error.message || 'Erro ao excluir organização');
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando organizações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Organizações / Clientes
            </CardTitle>
            <CardDescription>
              Gerencie as organizações cadastradas no sistema
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingOrg(null);
              resetFormData();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingOrg ? 'Editar Organização' : 'Nova Organização'}
                </DialogTitle>
                <DialogDescription>
                  {editingOrg 
                    ? 'Atualize os dados da organização' 
                    : 'Preencha os dados para criar uma nova organização'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Organização</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Secretaria de Turismo de..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Organização</Label>
                  <Select 
                    value={formData.org_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, org_type: v as OrgType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-blue-600" />
                          <span>Pública</span>
                          <span className="text-xs text-muted-foreground">(Governo/Município)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PRIVATE">
                        <div className="flex items-center gap-2">
                          <Hotel className="h-4 w-4 text-amber-600" />
                          <span>Privada</span>
                          <span className="text-xs text-muted-foreground">(Hotel/Resort/Empresa)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.org_type === 'PUBLIC' 
                      ? 'Organizações públicas usam indicadores territoriais (IGMA, IBGE)' 
                      : 'Organizações privadas podem usar indicadores enterprise (RevPAR, NPS)'}
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <Label htmlFor="enterprise-access" className="font-medium">
                        Acesso Enterprise
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Habilita indicadores hoteleiros (RevPAR, NPS, Ocupação)
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="enterprise-access"
                    checked={formData.has_enterprise_access}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_enterprise_access: checked }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingOrg ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar organizações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-sm text-muted-foreground">Organizações</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">
                {organizations.reduce((sum, o) => sum + o.user_count, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Usuários Totais</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold">
                {organizations.reduce((sum, o) => sum + o.destination_count, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Destinos Totais</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organização</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Usuários</TableHead>
              <TableHead className="text-center">Destinos</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'Nenhuma organização encontrada' : 'Nenhuma organização cadastrada'}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        org.org_type === 'PRIVATE' ? 'bg-amber-500/10' : 'bg-primary/10'
                      }`}>
                        {org.org_type === 'PRIVATE' ? (
                          <Hotel className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Landmark className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{org.name}</span>
                        {org.has_enterprise_access && (
                          <Badge variant="outline" className="ml-2 text-xs gap-1 border-primary/30 text-primary">
                            <Sparkles className="h-3 w-3" />
                            Enterprise
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.org_type === 'PRIVATE' ? 'secondary' : 'outline'} className="gap-1">
                      {org.org_type === 'PRIVATE' ? (
                        <>
                          <Hotel className="h-3 w-3" />
                          Privada
                        </>
                      ) : (
                        <>
                          <Landmark className="h-3 w-3" />
                          Pública
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {org.user_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {org.destination_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            disabled={org.user_count > 0 || org.destination_count > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir organização?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A organização <strong>{org.name}</strong> será permanentemente removida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(org.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
