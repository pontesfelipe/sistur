import { describe, it, expect } from 'vitest';
import { adviseMethodology } from '../methodologyAdvisor';

describe('adviseMethodology', () => {
  it('obra com convênio e etapas fixas → Cascata', () => {
    const r = adviseMethodology({ scope: 'fixed', fixedStages: true, teamSize: 'small', deliveryType: 'physical', meetingCadence: 'monthly', workFlow: 'deliverables' });
    expect(r.recommended).toBe('waterfall');
  });
  it('campanha com escopo aberto e reuniões semanais → Scrum', () => {
    const r = adviseMethodology({ scope: 'evolving', fixedStages: false, teamSize: 'medium', deliveryType: 'service', meetingCadence: 'weekly', workFlow: 'deliverables' });
    expect(r.recommended).toBe('scrum');
  });
  it('atendimento contínuo → Kanban', () => {
    const r = adviseMethodology({ scope: 'evolving', fixedStages: false, teamSize: 'small', deliveryType: 'service', meetingCadence: 'monthly', workFlow: 'continuous' });
    expect(r.recommended).toBe('kanban');
  });
  it('programa regional com vários órgãos → SAFe', () => {
    const r = adviseMethodology({ scope: 'evolving', fixedStages: false, teamSize: 'large', deliveryType: 'service', meetingCadence: 'weekly', workFlow: 'deliverables' });
    expect(r.recommended).toBe('safe');
  });
  it('mesmas respostas dão sempre a mesma recomendação', () => {
    const a = { scope: 'fixed', fixedStages: false, teamSize: 'medium', deliveryType: 'service', meetingCadence: 'weekly', workFlow: 'deliverables' } as const;
    expect(adviseMethodology(a)).toEqual(adviseMethodology(a));
  });
});
