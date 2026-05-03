import {
  GraduationCap,
  BookOpen,
  Map,
  Sparkles,
  Award,
  ScrollText,
  Users,
  MessageCircle,
  CalendarDays,
  Trophy,
  Gift,
} from 'lucide-react';
import type { SubNavItem } from './SubNav';

/** Hub: Minha Jornada — visão pessoal do aluno (XP, conquistas, recompensas, certificados). */
export const eduJornadaNav: SubNavItem[] = [
  { name: 'Visão geral', href: '/edu', icon: GraduationCap, exact: true },
  { name: 'Conquistas', href: '/edu/conquistas', icon: Trophy },
  { name: 'Recompensas', href: '/edu/recompensas', icon: Gift },
  { name: 'Certificados', href: '/certificados', icon: Award },
];

/** Hub: Aprender — todo o conteúdo formativo. */
export const eduAprenderNav: SubNavItem[] = [
  { name: 'Catálogo', href: '/edu/catalogo', icon: BookOpen },
  { name: 'Trilhas', href: '/edu/trilhas', icon: Map },
  { name: 'Adaptativas', href: '/edu/trilhas-adaptativas', icon: Sparkles },
  { name: 'Sob Demanda', href: '/edu/solicitacoes', icon: Sparkles },
];

/** Hub: Avaliações — provas e boletim. */
export const eduAvaliacoesNav: SubNavItem[] = [
  { name: 'Minhas Provas', href: '/edu/minhas-provas', icon: ScrollText },
  { name: 'Histórico Escolar', href: '/edu/boletim', icon: ScrollText },
];

/** Hub: Turmas & Mensagens. */
export const eduTurmasNav: SubNavItem[] = [
  { name: 'Minhas Turmas', href: '/edu/turmas', icon: Users },
  { name: 'Mensagens', href: '/edu/mensagens', icon: MessageCircle },
  { name: 'Calendário', href: '/edu/calendario', icon: CalendarDays },
];

/** Hub: Ajuda — tutorial, FAQ, metodologia. */
export const ajudaNav: SubNavItem[] = [
  { name: 'Tutorial', href: '/ajuda' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Metodologia', href: '/metodologia' },
];