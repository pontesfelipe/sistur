import { tx } from '@/i18n/t';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StudentProfileWizard } from '@/components/edu/StudentProfileWizard';

export default function EduPerfil() {
  const navigate = useNavigate();

  return (
    <AppLayout 
      title={tx('Perfil de Aprendizado')} 
      subtitle={tx('Configure suas preferências para recomendações personalizadas')}
    >
      <div className="max-w-3xl mx-auto">
        <StudentProfileWizard 
          onComplete={() => navigate('/edu')} 
          onCancel={() => navigate('/edu')} 
        />
      </div>
    </AppLayout>
  );
}
