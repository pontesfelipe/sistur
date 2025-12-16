import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockDestinations } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Destinos = () => {
  return (
    <AppLayout 
      title="Destinos" 
      subtitle="Gerencie os destinos turísticos"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar destinos..."
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Destino
        </Button>
      </div>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDestinations.map((destination, index) => (
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
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Código IBGE</span>
                <span className="font-mono text-foreground">{destination.ibge_code || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Coordenadas</span>
                <span className="font-mono text-foreground text-xs">
                  {destination.latitude?.toFixed(4)}, {destination.longitude?.toFixed(4)}
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

      {/* Empty State */}
      {mockDestinations.length === 0 && (
        <div className="text-center py-16">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Nenhum destino cadastrado
          </h3>
          <p className="mt-2 text-muted-foreground">
            Comece cadastrando seu primeiro destino turístico.
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Novo Destino
          </Button>
        </div>
      )}
    </AppLayout>
  );
};

export default Destinos;
