/**
 * SISTUR EDU - Certificate PDF Component
 * Generates a printable certificate with QR code for verification
 */

import { useRef, forwardRef, useImperativeHandle } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Award, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

export interface CertificatePDFProps {
  studentName: string;
  courseTitle: string;
  coursePillar: string;
  workloadMinutes: number;
  issuedAt: string;
  verificationCode: string;
  certificateId: string;
}

export interface CertificatePDFRef {
  print: () => void;
}

export const CertificatePDF = forwardRef<CertificatePDFRef, CertificatePDFProps>(({
  studentName,
  courseTitle,
  coursePillar,
  workloadMinutes,
  issuedAt,
  verificationCode,
  certificateId,
}, ref) => {
  const printRef = useRef<HTMLDivElement>(null);
  const verifyUrl = `${window.location.origin}/verificar-certificado/${verificationCode}`;
  
  const formattedDate = format(new Date(issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const workloadHours = Math.round(workloadMinutes / 60);

  const getPillarName = (pillar: string) => {
    const pillars: Record<string, string> = {
      RA: 'Recursos Ambientais',
      OE: 'Ordenamento Econômico',
      AO: 'Arranjo Organizacional',
    };
    return pillars[pillar] || pillar;
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o certificado');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificado - ${courseTitle}</title>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4 landscape;
              margin: 0;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .certificate-container {
              width: 297mm;
              height: 210mm;
              padding: 20mm;
              background: linear-gradient(135deg, #fafafa 0%, #f0f4f8 100%);
              position: relative;
              overflow: hidden;
            }
            
            .certificate-border {
              position: absolute;
              inset: 10mm;
              border: 3px solid #1a365d;
              pointer-events: none;
            }
            
            .certificate-inner-border {
              position: absolute;
              inset: 12mm;
              border: 1px solid #cbd5e1;
              pointer-events: none;
            }
            
            .certificate-content {
              position: relative;
              z-index: 1;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .logo {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .logo-icon {
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #1a365d, #2c5282);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-family: 'Playfair Display', serif;
              font-weight: 700;
              font-size: 20px;
            }
            
            .logo-text {
              font-family: 'Playfair Display', serif;
              font-weight: 700;
              font-size: 24px;
              color: #1a365d;
            }
            
            .certificate-id {
              font-size: 11px;
              color: #64748b;
              text-align: right;
            }
            
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              gap: 16px;
            }
            
            .award-icon {
              width: 60px;
              height: 60px;
              color: #1a365d;
            }
            
            .title {
              font-family: 'Playfair Display', serif;
              font-size: 36px;
              font-weight: 700;
              color: #1a365d;
              letter-spacing: 4px;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 20px;
            }
            
            .student-name {
              font-family: 'Playfair Display', serif;
              font-size: 32px;
              font-weight: 600;
              color: #0f172a;
              border-bottom: 2px solid #1a365d;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }
            
            .completion-text {
              font-size: 16px;
              color: #334155;
              line-height: 1.6;
              max-width: 600px;
            }
            
            .course-title {
              font-weight: 600;
              color: #1a365d;
            }
            
            .course-info {
              display: flex;
              justify-content: center;
              gap: 32px;
              margin-top: 16px;
              font-size: 13px;
              color: #475569;
            }
            
            .info-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .signature {
              text-align: center;
            }
            
            .signature-line {
              width: 180px;
              border-top: 1px solid #334155;
              margin-bottom: 4px;
            }
            
            .signature-name {
              font-size: 13px;
              font-weight: 600;
              color: #1a365d;
            }
            
            .signature-title {
              font-size: 11px;
              color: #64748b;
            }
            
            .qr-section {
              text-align: center;
            }
            
            .qr-code {
              background: white;
              padding: 8px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .qr-text {
              font-size: 10px;
              color: #64748b;
              margin-top: 6px;
            }
            
            .date-section {
              text-align: center;
            }
            
            .date-label {
              font-size: 11px;
              color: #64748b;
              margin-bottom: 4px;
            }
            
            .date-value {
              font-size: 14px;
              font-weight: 500;
              color: #1a365d;
            }
            
            @media print {
              html, body {
                width: 297mm;
                height: 210mm;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  useImperativeHandle(ref, () => ({
    print: handlePrint,
  }));

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-3 justify-center print:hidden">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Certificado
        </Button>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Download className="h-4 w-4" />
          Salvar como PDF
        </Button>
      </div>

      {/* Certificate Preview */}
      <div className="border rounded-lg overflow-hidden shadow-lg bg-white">
        <div 
          ref={printRef}
          className="certificate-preview"
          style={{ 
            aspectRatio: '297 / 210',
            padding: '5%',
            background: 'linear-gradient(135deg, #fafafa 0%, #f0f4f8 100%)',
            position: 'relative',
          }}
        >
          <div className="certificate-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Border decorations */}
            <div style={{
              position: 'absolute',
              inset: '2%',
              border: '3px solid #1a365d',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              inset: '3%',
              border: '1px solid #cbd5e1',
              pointerEvents: 'none',
            }} />

            {/* Content */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '4%',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #1a365d, #2c5282)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: 700,
                    fontSize: '20px',
                  }}>
                    S
                  </div>
                  <span style={{
                    fontFamily: 'Playfair Display, serif',
                    fontWeight: 700,
                    fontSize: '24px',
                    color: '#1a365d',
                  }}>
                    SISTUR EDU
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                  <div>ID: {certificateId}</div>
                  <div>Verificação: {verificationCode}</div>
                </div>
              </div>

              {/* Main Content */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                textAlign: 'center',
                gap: '12px',
              }}>
                <Award style={{ width: '48px', height: '48px', color: '#1a365d' }} />
                
                <h1 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#1a365d',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                }}>
                  CERTIFICADO
                </h1>
                
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  Certificamos que
                </p>
                
                <h2 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#0f172a',
                  borderBottom: '2px solid #1a365d',
                  paddingBottom: '8px',
                }}>
                  {studentName}
                </h2>
                
                <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, maxWidth: '500px' }}>
                  concluiu com êxito o curso <span style={{ fontWeight: 600, color: '#1a365d' }}>{courseTitle}</span>,
                  com carga horária de <strong>{workloadHours} hora{workloadHours !== 1 ? 's' : ''}</strong>,
                  na área de <strong>{getPillarName(coursePillar)}</strong>.
                </p>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {/* Date */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    Emitido em
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a365d' }}>
                    {formattedDate}
                  </div>
                </div>

                {/* Signature */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '160px', borderTop: '1px solid #334155', marginBottom: '4px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a365d' }}>
                    Coordenação SISTUR
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Sistema de Turismo Sustentável
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    background: 'white',
                    padding: '6px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'inline-block',
                  }}>
                    <QRCodeSVG 
                      value={verifyUrl}
                      size={64}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
                    Escaneie para verificar
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Info */}
      <div className="text-center text-sm text-muted-foreground print:hidden">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Certificado verificável em: <code className="bg-muted px-2 py-0.5 rounded">{verifyUrl}</code></span>
        </div>
      </div>
    </div>
  );
});

CertificatePDF.displayName = 'CertificatePDF';

export default CertificatePDF;
