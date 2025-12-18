import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Award, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrackCertificateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackName: string;
  userName: string;
  completedAt: Date;
  totalTrainings: number;
  delivery?: string;
}

export const TrackCertificate = ({
  open,
  onOpenChange,
  trackName,
  userName,
  completedAt,
  totalTrainings,
  delivery,
}: TrackCertificateProps) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = certificateRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificado - ${trackName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            
            .certificate {
              width: 800px;
              height: 566px;
              margin: 0 auto;
              background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
              padding: 40px;
              position: relative;
              overflow: hidden;
            }
            
            .certificate::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              pointer-events: none;
            }
            
            .inner {
              background: white;
              height: 100%;
              padding: 40px;
              border-radius: 8px;
              position: relative;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            
            .inner::before {
              content: '';
              position: absolute;
              inset: 8px;
              border: 2px solid #e2e8f0;
              border-radius: 4px;
              pointer-events: none;
            }
            
            .logo {
              font-family: 'Playfair Display', serif;
              font-size: 24px;
              font-weight: 700;
              color: #1a365d;
              margin-bottom: 20px;
            }
            
            .title {
              font-family: 'Playfair Display', serif;
              font-size: 36px;
              font-weight: 700;
              color: #1a365d;
              margin-bottom: 8px;
            }
            
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 24px;
            }
            
            .name {
              font-family: 'Playfair Display', serif;
              font-size: 28px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 16px;
            }
            
            .track {
              font-size: 18px;
              font-weight: 600;
              color: #334155;
              margin-bottom: 8px;
            }
            
            .details {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 24px;
            }
            
            .date {
              font-size: 12px;
              color: #94a3b8;
            }
            
            .footer {
              position: absolute;
              bottom: 24px;
              left: 0;
              right: 0;
              display: flex;
              justify-content: space-between;
              padding: 0 48px;
            }
            
            .signature {
              text-align: center;
            }
            
            .signature-line {
              width: 150px;
              border-top: 1px solid #cbd5e1;
              margin-bottom: 4px;
            }
            
            .signature-text {
              font-size: 10px;
              color: #94a3b8;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .certificate {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formattedDate = format(completedAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Certificado de Conclusão
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div 
          ref={certificateRef}
          className="certificate"
          style={{
            width: '100%',
            maxWidth: '800px',
            aspectRatio: '1.414',
            margin: '0 auto',
            background: 'linear-gradient(135deg, hsl(222, 47%, 20%) 0%, hsl(214, 57%, 35%) 100%)',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '8px',
          }}
        >
          <div 
            className="inner"
            style={{
              background: 'white',
              height: '100%',
              padding: '32px',
              borderRadius: '8px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              border: '2px solid hsl(214, 32%, 91%)',
            }}
          >
            <div style={{ 
              fontFamily: 'serif', 
              fontSize: '20px', 
              fontWeight: 700, 
              color: 'hsl(222, 47%, 20%)',
              marginBottom: '16px',
            }}>
              SISTUR EDU
            </div>
            
            <div style={{ 
              fontFamily: 'serif',
              fontSize: '32px', 
              fontWeight: 700, 
              color: 'hsl(222, 47%, 20%)',
              marginBottom: '8px',
            }}>
              CERTIFICADO
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: 'hsl(215, 16%, 47%)',
              marginBottom: '24px',
            }}>
              Certificamos que
            </div>
            
            <div style={{ 
              fontFamily: 'serif',
              fontSize: '24px', 
              fontWeight: 700, 
              color: 'hsl(222, 47%, 11%)',
              marginBottom: '16px',
            }}>
              {userName}
            </div>
            
            <div style={{ 
              fontSize: '14px', 
              color: 'hsl(215, 16%, 47%)',
              marginBottom: '8px',
            }}>
              concluiu com êxito a trilha formativa
            </div>
            
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: 'hsl(215, 25%, 27%)',
              marginBottom: '8px',
            }}>
              {trackName}
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: 'hsl(215, 16%, 47%)',
              marginBottom: '24px',
            }}>
              {totalTrainings} treinamentos • {delivery || 'Trilha completa'}
            </div>
            
            <div style={{ 
              fontSize: '11px', 
              color: 'hsl(215, 20%, 65%)',
            }}>
              Concluído em {formattedDate}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};