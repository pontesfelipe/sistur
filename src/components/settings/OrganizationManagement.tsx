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
  Hotel
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  has_territorial_access: boolean;
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
    has_territorial_access: true,
    has_enterprise_access: false 
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      const { data: orgs, error } = await supabase
        .from('orgs')
        .select('id, name, has_territorial_access, has_enterprise_access, created_at')
        .order('name');

      if (error) throw error;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('pending_approval', false);

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
        has_territorial_access: org.has_territorial_access ?? true,
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
        has_territorial_access: formData.has_territorial_access,
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
    setFormData({ name: '', has_territorial_access: true, has_enterprise_access: false });
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({ 
      name: org.name, 
      has_territorial_access: org.has_territorial_access ?? true,
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
              <Building2 className="h-5 w-5" />
              Organizações
            </CardTitle>
            <CardDescription>
              Gerencie as organizações cadastradas no sistema
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              resetFormData();
              setEditingOrg(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Organização
              </Button>
            </DialogTrigger>
            <DialogContent>
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

                <div className="space-y-3">
                  <Label>Acessos Habilitados</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Configure quais tipos de diagnóstico esta organização pode executar.
                    Ambos podem ser habilitados simultaneamente.
                  </p>
                  
                  {/* Toggle Territorial */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Landmark className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <Label htmlFor="territorial-access" className="font-medium">
                          Acesso Territorial
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Diagnósticos públicos com indicadores IGMA para destinos turísticos.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="territorial-access"
                      checked={formData.has_territorial_access}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_territorial_access: checked }))}
                    />
                  </div>

                  {/* Toggle Enterprise */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Hotel className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <Label htmlFor="enterprise-access" className="font-medium">
                          Acesso Enterprise
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Diagnósticos hoteleiros com indicadores de performance (RevPAR, NPS, etc).
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
              <TableHead>Acessos</TableHead>
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
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {org.has_territorial_access && (
                        <Badge variant="outline" className="text-xs gap-1 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
                          <Landmark className="h-3 w-3" />
                          Territorial
                        </Badge>
                      )}
                      {org.has_enterprise_access && (
                        <Badge variant="outline" className="text-xs gap-1 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30">
                          <Hotel className="h-3 w-3" />
                          Enterprise
                        </Badge>
                      )}
                      {!org.has_territorial_access && !org.has_enterprise_access && (
                        <span className="text-xs text-muted-foreground">Nenhum</span>
                      )}
                    </div>
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
