import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Award, 
  Download, 
  ExternalLink, 
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Share2,
  Copy,
  FileText,
  Printer,
} from 'lucide-react';
import { useUserCertificates, type CertificateWithDetails } from '@/hooks/useCertificates';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CertificatePDF } from '@/components/edu/CertificatePDF';

const Certificates = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'print'>('details');
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: certificates, isLoading } = useUserCertificates();

  const filteredCertificates = certificates?.filter(cert => {
    const courseName = cert.lms_courses?.title || '';
    return !searchQuery || courseName.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const activeCertificates = filteredCertificates.filter(c => c.status === 'active');
  const revokedCertificates = filteredCertificates.filter(c => c.status === 'revoked');

  const handleCopyVerificationLink = (code: string) => {
    const url = `${window.location.origin}/verificar-certificado/${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de verificação copiado!');
  };

  const handleShare = async (cert: CertificateWithDetails) => {
    const url = `${window.location.origin}/verificar-certificado/${cert.verification_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificado - ${cert.lms_courses?.title}`,
          text: `Confira meu certificado de conclusão do curso ${cert.lms_courses?.title}`,
          url,
        });
      } catch (error) {
        handleCopyVerificationLink(cert.verification_code);
      }
    } else {
      handleCopyVerificationLink(cert.verification_code);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Meus Certificados" subtitle="Carregando...">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Meus Certificados" 
      subtitle="Certificados de conclusão de cursos e trilhas"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-primary">
                {activeCertificates.length}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Award className="h-4 w-4" />
                Certificados Ativos
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold">
                {certificates?.length || 0}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Total de Certificados
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-muted-foreground">
                {revokedCertificates.length}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Revogados
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar certificados..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Certificates Grid */}
        {filteredCertificates.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum certificado encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Complete cursos e trilhas para obter seus certificados
              </p>
              <Button asChild>
                <Link to="/edu">Explorar Cursos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCertificates.map((cert) => (
              <Card 
                key={cert.certificate_id}
                className={`group hover:shadow-lg transition-all cursor-pointer ${
                  cert.status === 'revoked' ? 'opacity-60' : ''
                }`}
                onClick={() => setSelectedCertificate(cert)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        cert.status === 'active' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Award className="h-6 w-6" />
                      </div>
                      {cert.status === 'active' ? (
                        <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Válido
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Revogado
                        </Badge>
                      )}
                    </div>
                  </div>
                <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                    {cert.lms_courses?.title || 'Curso'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Emitido em {format(new Date(cert.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Código: {cert.verification_code.slice(0, 8)}...
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyVerificationLink(cert.verification_code);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(cert);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Certificate Detail Dialog */}
        <Dialog open={!!selectedCertificate} onOpenChange={(open) => {
          if (!open) {
            setSelectedCertificate(null);
            setViewMode('details');
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Certificado de Conclusão
              </DialogTitle>
              <DialogDescription>
                {selectedCertificate?.lms_courses?.title}
              </DialogDescription>
            </DialogHeader>
            {selectedCertificate && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'details' | 'print')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="print">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir / PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-4">
                  {/* Certificate Preview */}
                  <div className="border rounded-lg p-8 bg-gradient-to-br from-primary/5 to-primary/10 text-center space-y-4">
                    <Award className="h-16 w-16 mx-auto text-primary" />
                    <h2 className="text-2xl font-bold">
                      {selectedCertificate.lms_courses?.title}
                    </h2>
                    <p className="text-muted-foreground">
                      Certificamos que <strong>{selectedCertificate.profiles?.full_name || profile?.full_name || 'Aluno'}</strong><br />
                      concluiu com êxito o curso acima
                    </p>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Data de conclusão: {format(new Date(selectedCertificate.issued_at), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Código de Verificação:</span>
                      <p className="font-mono font-medium">{selectedCertificate.verification_code}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p>
                        {selectedCertificate.status === 'active' ? (
                          <Badge className="bg-green-500/20 text-green-700">Válido</Badge>
                        ) : (
                          <Badge variant="destructive">Revogado</Badge>
                        )}
                      </p>
                    </div>
                    {selectedCertificate.workload_minutes && (
                      <div>
                        <span className="text-muted-foreground">Carga Horária:</span>
                        <p className="font-semibold">{Math.round(selectedCertificate.workload_minutes / 60)}h</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">ID do Certificado:</span>
                      <p className="font-mono text-xs">{selectedCertificate.certificate_id}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => handleCopyVerificationLink(selectedCertificate.verification_code)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleShare(selectedCertificate)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Compartilhar
                    </Button>
                    <Button asChild>
                      <Link to={`/verificar-certificado/${selectedCertificate.verification_code}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Página Pública
                      </Link>
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="print" className="mt-4">
                  <CertificatePDF
                    studentName={selectedCertificate.profiles?.full_name || profile?.full_name || 'Aluno'}
                    courseTitle={selectedCertificate.lms_courses?.title || 'Curso'}
                    coursePillar={selectedCertificate.pillar_scope || 'RA'}
                    workloadMinutes={selectedCertificate.workload_minutes || 60}
                    issuedAt={selectedCertificate.issued_at}
                    verificationCode={selectedCertificate.verification_code}
                    certificateId={selectedCertificate.certificate_id}
                  />
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Certificates;
