/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface ObservatoryCriticalAlertProps {
  orgName?: string
  metricName?: string
  unit?: string
  previousValue?: number | string
  currentValue?: number | string
  deltaPct?: number | string
  period?: string
  message?: string
}

const ObservatoryCriticalAlertEmail = ({
  orgName, metricName, unit, previousValue, currentValue, deltaPct, period, message,
}: ObservatoryCriticalAlertProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Alerta crítico no Observatório: {metricName ?? 'indicador'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Text style={logoText}>{SITE_NAME} — Observatório</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>⚠️ Alerta crítico detectado</Heading>
        <Text style={text}>
          O Observatório Turístico identificou uma variação crítica em <strong>{orgName ?? 'seu destino'}</strong>.
        </Text>
        <Section style={card}>
          <Text style={cardLabel}>Indicador</Text>
          <Text style={cardValue}>{metricName ?? '—'}</Text>
          <Text style={cardLabel}>Período</Text>
          <Text style={cardValue}>{period ?? '—'}</Text>
          <Text style={cardLabel}>Variação</Text>
          <Text style={cardValueAlert}>
            {typeof deltaPct === 'number' ? deltaPct.toFixed(1) : deltaPct}%
            {' '}({previousValue} → {currentValue} {unit ?? ''})
          </Text>
        </Section>
        {message && <Text style={text}>{message}</Text>}
        <Section style={buttonContainer}>
          <Button style={button} href={`${SITE_URL}/observatorio`}>Abrir Observatório</Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Você está recebendo este alerta porque administra um destino monitorado no {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ObservatoryCriticalAlertEmail,
  subject: (d: Record<string, any>) =>
    `⚠️ Alerta crítico — ${d?.metricName ?? 'Observatório'} (${d?.orgName ?? 'destino'})`,
  displayName: 'Observatório — Alerta crítico',
  previewData: {
    orgName: 'Município Demo',
    metricName: 'Taxa de Ocupação Hoteleira',
    unit: '%',
    previousValue: '72,4',
    currentValue: '48,1',
    deltaPct: -33.6,
    period: 'Outubro/2026',
    message: 'Queda significativa em relação ao mês anterior.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const logoSection = { padding: '8px 0' }
const logoText = { fontSize: '20px', fontWeight: 'bold', color: '#0f766e', margin: 0 }
const divider = { borderColor: '#e5e7eb', margin: '16px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#b91c1c', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const card = { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', margin: '16px 0' }
const cardLabel = { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, margin: '8px 0 2px', letterSpacing: '0.5px' }
const cardValue = { fontSize: '14px', color: '#111827', fontWeight: 600 as const, margin: '0 0 4px' }
const cardValueAlert = { fontSize: '16px', color: '#b91c1c', fontWeight: 700 as const, margin: '0 0 4px' }
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' }
const button = { backgroundColor: '#b91c1c', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '24px 0 0' }