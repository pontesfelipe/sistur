import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  User,
  BookOpen,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { useVerifyCertificate } from '@/hooks/useCertificates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const VerifyCertificate = () => {
  const { code } = useParams<{ code: string }>();
  const { data: certificate, isLoading, error } = useVerifyCertificate(code);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-red-500/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-red-500/10">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Certificado Não Encontrado</CardTitle>
            <CardDescription>
              O código de verificação informado não corresponde a nenhum certificado válido.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Verifique se o código foi digitado corretamente ou entre em contato com o emissor.
            </p>
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = certificate.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            SISTUR EDU
          </Link>
          <h1 className="text-2xl font-bold">Verificação de Certificado</h1>
        </div>

        {/* Status Card */}
        <Card className={`border-2 ${isValid ? 'border-green-500/50' : 'border-red-500/50'}`}>
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto mb-4 p-4 rounded-full ${isValid ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {isValid ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <Badge className={`mx-auto ${isValid ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30'}`}>
              {isValid ? (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  Certificado Válido
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Certificado Revogado
                </>
              )}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                {isValid 
                  ? 'Este certificado é autêntico e foi emitido pela plataforma SISTUR EDU.'
                  : `Este certificado foi revogado. Motivo: ${certificate.revocation_reason || 'Não especificado'}`
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle>{certificate.course?.title || 'Curso'}</CardTitle>
                <CardDescription>Certificado de Conclusão</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Aluno</p>
                  <p className="font-medium">{certificate.profile?.full_name || 'Nome não disponível'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data de Emissão</p>
                  <p className="font-medium">
                    {format(new Date(certificate.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Código de Verificação</p>
                  <p className="font-mono font-medium text-sm">{certificate.verification_code}</p>
                </div>
              </div>
              {certificate.score_achieved && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nota Obtida</p>
                    <p className="font-medium">{certificate.score_achieved}%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Footer */}
            <div className="pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Verificação realizada em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Este documento foi verificado automaticamente pelo sistema SISTUR EDU
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyCertificate;
