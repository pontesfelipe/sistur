import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminCursos() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/edu?tab=admin', { replace: true });
  }, [navigate]);

  return null;
}
