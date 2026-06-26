import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useConsortia, useCreateConsortium } from "@/hooks/useConsortia";
import { useProfileContext } from "@/contexts/ProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Network, Plus, Loader2 } from "lucide-react";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CreateConsortiumDialog() {
  const { profile, isAdmin, isOrgAdmin } = useProfileContext();
  const create = useCreateConsortium();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!isAdmin && !isOrgAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Consórcio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar consórcio / região turística</DialogTitle>
          <DialogDescription>
            Seu município será o líder do consórcio. Você poderá convidar outros municípios em seguida.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Consórcio Vale Histórico" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vocação, abrangência geográfica, objetivos..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={!name.trim() || !profile?.org_id || create.isPending}
            onClick={async () => {
              if (!profile?.org_id) return;
              await create.mutateAsync({
                name: name.trim(),
                slug: slugify(name) + "-" + Date.now().toString(36),
                description: description.trim() || undefined,
                lead_org_id: profile.org_id,
              });
              setOpen(false);
              setName("");
              setDescription("");
            }}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Consorcios() {
  const { data: list, isLoading } = useConsortia();

  return (
    <AppLayout title="Consórcios">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              Análise Regional / Consórcios
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Agrupe municípios em um consórcio ou região turística para comparar diagnósticos e coordenar ações regionais. A comparação é privada entre os membros aceitos.
            </p>
          </div>
          <CreateConsortiumDialog />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !list || list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Network className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum consórcio disponível ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Para criar um, seu município precisa ser o líder. Para participar, peça ao consórcio para convidar seu município.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list.map((c) => (
              <Link key={c.id} to={`/consorcios/${c.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                    </div>
                    {c.description && <CardDescription className="line-clamp-2">{c.description}</CardDescription>}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}