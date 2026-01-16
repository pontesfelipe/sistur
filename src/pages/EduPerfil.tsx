import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { StudentProfileWizard } from '@/components/edu/StudentProfileWizard';

export default function EduPerfil() {
  const navigate = useNavigate();

  return (
    <AppLayout 
      title="Perfil de Aprendizado" 
      subtitle="Configure suas preferências para recomendações personalizadas"
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
