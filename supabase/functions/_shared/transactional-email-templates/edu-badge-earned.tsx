/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { tt, trAmount, normalizeLang } from './i18n.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface BadgeEarnedProps { badgeTitle?: string; xpReward?: number }

const EduBadgeEarnedEmail = ({ badgeTitle, xpReward, language }: BadgeEarnedProps & { language?: string }) => (
  <Html lang={normalizeLang(language)} dir="ltr">
    <Head />
    <Preview>{tt(language, 'Você conquistou uma nova badge no SISTUR')}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Text style={logoText}>{SITE_NAME} EDU</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>{tt(language, '🏆 Nova badge conquistada!')}</Heading>
        <Text style={text}>
          {tt(language, 'Você acaba de conquistar a badge')} <strong>{badgeTitle ?? tt(language, 'Conquista')}</strong>
          {typeof xpReward === 'number' && xpReward > 0 ? <> {tt(language, 'e ganhou')} <strong>+{xpReward} XP</strong></> : null}.
        </Text>
        <Text style={text}>{tt(language, 'Continue assim — cada badge é um marco da sua jornada.')}</Text>
        <Section style={buttonContainer}>
          <Button style={button} href={`${SITE_URL}/edu/conquistas`}>{tt(language, 'Ver minhas conquistas')}</Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>Equipe {SITE_NAME} — Sistema Integrado de Suporte para Turismo em Regiões</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EduBadgeEarnedEmail,
  subject: (d: Record<string, any>) => tt(d?.language, '🏆 Você conquistou a badge "{badge}"', { badge: d?.badgeTitle ?? '' }),
  displayName: 'EDU — Badge conquistada',
  previewData: { badgeTitle: 'Maratonista', xpReward: 100 },
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