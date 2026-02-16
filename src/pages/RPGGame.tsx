import { useNavigate } from 'react-router-dom';
import { RPGGame } from '@/rpg/components/RPGGame';

export default function RPGGamePage() {
  const navigate = useNavigate();

  return <RPGGame onBack={() => navigate('/game')} />;
}
