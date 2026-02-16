import { useNavigate } from 'react-router-dom';
import { MemoryGame } from '@/memory/components/MemoryGame';

export default function MemoryGamePage() {
  const navigate = useNavigate();
  return <MemoryGame onBack={() => navigate('/game')} />;
}
