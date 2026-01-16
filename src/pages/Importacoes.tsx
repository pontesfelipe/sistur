import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// This page now redirects to Diagnósticos > Preenchimento de Dados tab
const Importacoes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('assessment');

  useEffect(() => {
    // Redirect to diagnosticos page with importacao tab
    const url = assessmentId 
      ? `/diagnosticos?tab=importacao&assessment=${assessmentId}`
      : '/diagnosticos?tab=importacao';
    navigate(url, { replace: true });
  }, [navigate, assessmentId]);

  return null;
};

export default Importacoes;
