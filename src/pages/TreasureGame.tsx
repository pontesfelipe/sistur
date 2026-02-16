import { useNavigate } from 'react-router-dom';
import { TreasureGame } from '@/treasure/components/TreasureGame';

export default function TreasureGamePage() {
  const navigate = useNavigate();
  return <TreasureGame onBack={() => navigate('/game')} />;
}
