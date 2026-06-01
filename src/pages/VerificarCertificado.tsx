import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useVerifyCertification } from "@/hooks/useDestinationCertifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Search } from "lucide-react";

const LEVEL_COLOR: Record<string, string> = {
  bronze: "#CD7F32",
  prata: "#C0C0C0",
  ouro: "#FFD700",
  diamante: "#B9F2FF",
};

export default function VerificarCertificado() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(urlCode ?? "");
  const { data, isLoading, isFetching } = useVerifyCertification(urlCode ?? null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) navigate(`/verificar-certificado/${input.trim()}`);
  };

  const cert: any = data;
  const valid = cert?.is_valid;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Verificação de Certificado SISTUR
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Valide a autenticidade do Selo Institucional do Destino.
          </p>
        </header>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: SISTUR-XXXX-XXXX-XXXX"
            className="font-mono"
          />
          <Button type="submit"><Search className="h-4 w-4 mr-1" /> Verificar</Button>
        </form>

        {urlCode && (isLoading || isFetching) && (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">Consultando...</CardContent></Card>
        )}

        {urlCode && !isLoading && !cert && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-center space-y-2">
              <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-semibold">Certificado não encontrado</p>
              <p className="text-sm text-muted-foreground">O código informado não consta em nossa base.</p>
            </CardContent>
          </Card>
        )}

        {cert && (
          <Card className={valid ? "border-green-500/40" : "border-destructive/40"}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: LEVEL_COLOR[cert.level] ?? "#888", color: "#000" }}
                  >
                    ★
                  </div>
                  <div>
                    <CardTitle>{cert.level_display_name}</CardTitle>
                    <CardDescription>{cert.org_name}</CardDescription>
                  </div>
                </div>
                <Badge variant={valid ? "default" : "destructive"} className="text-base px-3 py-1">
                  {valid ? "Válido" : cert.status === "revogado" ? "Revogado" : "Expirado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <Stat label="Geral" value={cert.overall_score} />
                <Stat label="RA" value={cert.ra_score} />
                <Stat label="OE" value={cert.oe_score} />
                <Stat label="AO" value={cert.ao_score} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
                <div>
                  <p className="text-muted-foreground">Emitido em</p>
                  <p className="font-medium">{new Date(cert.issued_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Válido até</p>
                  <p className="font-medium">{new Date(cert.valid_until).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Código de verificação</p>
                  <p className="font-mono text-xs">{cert.verification_code}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground">
          SISTUR — Sistema Integrado de Suporte para Turismo em Regiões
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value != null ? `${Number(value).toFixed(0)}%` : "—"}</p>
    </div>
  );
}