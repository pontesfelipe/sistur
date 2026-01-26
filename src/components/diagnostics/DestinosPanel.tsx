import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Hotel
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDestinations } from '@/hooks/useDestinations';
import { useEnterpriseProfiles } from '@/hooks/useEnterpriseProfiles';
import { useProfile } from '@/hooks/useProfile';
import { DestinationFormDialog } from '@/components/destinations/DestinationFormDialog';
import { EnterpriseProfilePanel } from '@/components/enterprise/EnterpriseProfilePanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

import type { Destination } from '@/components/destinations/DestinationFormDialog';

export function DestinosPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [enterpriseProfileDestination, setEnterpriseProfileDestination] = useState<Destination | null>(null);
  const [hasEnterpriseAccess, setHasEnterpriseAccess] = useState(false);
  
  const { effectiveOrgId } = useProfile();
  const { destinations, isLoading, createDestination, updateDestination, deleteDestination } = useDestinations();
  const { profiles: enterpriseProfiles } = useEnterpriseProfiles();
  
  // Check if organization has enterprise access
  useEffect(() => {
    if (!effectiveOrgId) return;
    
    const fetchOrgAccess = async () => {
      const { data } = await supabase
        .from('orgs')
        .select('has_enterprise_access')
        .eq('id', effectiveOrgId)
        .single();
      
      setHasEnterpriseAccess(data?.has_enterprise_access ?? false);
    };
    
    fetchOrgAccess();
  }, [effectiveOrgId]);
  
  // Helper to check if destination has enterprise profile
  const hasEnterpriseProfile = (destId: string) => 
    enterpriseProfiles?.some(p => p.destination_id === destId) ?? false;

  const filteredDestinations = destinations?.filter((dest) =>
    dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dest.uf?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleSubmit = async (data: { name: string; uf: string; ibge_code?: string | null; latitude?: number | null; longitude?: number | null }) => {
    if (editingDestination) {
      await updateDestination.mutateAsync({ id: editingDestination.id, ...data });
    } else {
      await createDestination.mutateAsync(data);
    }
  };

  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingDestination(null);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDestination.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar destinos..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Destino
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Destinations Grid */}
      {!isLoading && filteredDestinations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((destination, index) => (
            <div
              key={destination.id}
              className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {destination.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {destination.uf}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {hasEnterpriseProfile(destination.id) && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <Hotel className="h-3 w-3 mr-1" />
                      Enterprise
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(destination)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      {hasEnterpriseAccess && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEnterpriseProfileDestination(destination)}>
                            <Hotel className="mr-2 h-4 w-4 text-amber-600" />
                            Perfil Enterprise
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteId(destination.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Código IBGE</span>
                  <span className="font-mono text-foreground">{destination.ibge_code || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Coordenadas</span>
                  <span className="font-mono text-foreground text-xs">
                    {destination.latitude && destination.longitude 
                      ? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`
                      : '—'}
                  </span>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to={`/diagnosticos?destino=${destination.id}`}>
                  Ver diagnósticos
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredDestinations.length === 0 && (
        <div className="text-center py-16">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {searchQuery ? 'Nenhum destino encontrado' : 'Nenhum destino cadastrado'}
          </h3>
          <p className="mt-2 text-muted-foreground">
            {searchQuery 
              ? 'Tente ajustar sua busca.'
              : 'Comece cadastrando seu primeiro destino turístico.'}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Destino
            </Button>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <DestinationFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleSubmit}
        destination={editingDestination}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir destino?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os diagnósticos associados também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enterprise Profile Dialog */}
      <Dialog 
        open={!!enterpriseProfileDestination} 
        onOpenChange={(open) => !open && setEnterpriseProfileDestination(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {enterpriseProfileDestination && (
            <EnterpriseProfilePanel
              destinationId={enterpriseProfileDestination.id}
              destinationName={enterpriseProfileDestination.name}
              onClose={() => setEnterpriseProfileDestination(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
