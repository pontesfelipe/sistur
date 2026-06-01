import { useConsortia } from "@/hooks/useConsortia";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Card compacto para o Dashboard listando consórcios em que o usuário/org participa.
 * Visível apenas quando há pelo menos 1 consórcio (RLS já filtra).
 */
export function MyConsortiaCard() {
  const { data, isLoading } = useConsortia();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              Consórcios em que participo
            </CardTitle>
            <CardDescription className="mt-1">
              Benchmarking regional privado entre municípios membros.
            </CardDescription>
          </div>
          <Badge variant="secondary">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 3).map((c) => (
          <Link
            key={c.id}
            to={`/consorcios/${c.id}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              {c.description && (
                <p className="text-xs text-muted-foreground truncate">{c.description}</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </Link>
        ))}
        {data.length > 3 && (
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/consorcios">Ver todos ({data.length})</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}