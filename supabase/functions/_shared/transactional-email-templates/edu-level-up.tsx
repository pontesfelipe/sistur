/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface LevelUpProps { level?: number; totalXp?: number }

const EduLevelUpEmail = ({ level, totalXp }: LevelUpProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Parabéns! Você subiu para o nível {level ?? '?'} no {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Text style={logoText}>{SITE_NAME} EDU</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>🎉 Você subiu de nível!</Heading>
        <Text style={text}>
          Excelente trabalho — você acaba de alcançar o <strong>Nível {level ?? '—'}</strong>
          {typeof totalXp === 'number' ? <> com <strong>{totalXp} XP</strong> acumulados</> : null}.
        </Text>
        <Text style={text}>
          Continue evoluindo na sua trilha de aprendizado e desbloqueie novas recompensas.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={`${SITE_URL}/edu/conquistas`}>Ver minhas conquistas</Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>Equipe {SITE_NAME} — Sistema Integrado de Suporte para Turismo em Regiões</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EduLevelUpEmail,
  subject: (d: Record<string, any>) => `🎉 Nível ${d?.level ?? ''} desbloqueado no ${SITE_NAME}`,
  displayName: 'EDU — Subiu de nível',
  previewData: { level: 5, totalXp: 1250 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const logoSection = { padding: '8px 0' }
const logoText = { fontSize: '20px', fontWeight: 'bold', color: '#0f766e', margin: 0 }
const divider = { borderColor: '#e5e7eb', margin: '16px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '24px 0 0' }