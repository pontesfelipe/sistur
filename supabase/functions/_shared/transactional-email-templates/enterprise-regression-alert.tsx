/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface Drop {
  pillar: string
  from: number
  to: number
  drop1: number
  drop2: number
}

interface Props {
  destinationName?: string
  diagnosticType?: string
  drops?: Drop[]
  assessmentId?: string
}

const EnterpriseRegressionAlertEmail = ({
  destinationName, diagnosticType, drops, assessmentId,
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Regressão detectada em {destinationName ?? 'seu diagnóstico'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}><Text style={logoText}>{SITE_NAME} — Diagnóstico</Text></Section>
        <Hr style={divider} />
        <Heading style={h1}>⚠️ Regressão detectada</Heading>
        <Text style={text}>
          Identificamos quedas superiores a 2 pontos percentuais em 2 rodadas consecutivas
          {destinationName ? <> em <strong>{destinationName}</strong></> : null}
          {diagnosticType === 'enterprise' ? ' (modo Enterprise).' : ' (modo Territorial).'}
        </Text>
        {(drops ?? []).map((d) => (
          <Section key={d.pillar} style={card}>
            <Text style={cardLabel}>Pilar</Text>
            <Text style={cardValue}>I-{d.pillar}</Text>
            <Text style={cardLabel}>Variação acumulada</Text>
            <Text style={cardValueAlert}>{d.from}% → {d.to}% (−{(d.drop1 + d.drop2).toFixed(1)} pp)</Text>
          </Section>
        ))}
        <Section style={buttonContainer}>
          <Button style={button} href={`${SITE_URL}/diagnosticos/${assessmentId ?? ''}`}>
            Abrir diagnóstico
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Você recebeu este alerta porque é responsável por um diagnóstico monitorado no {SITE_NAME}.
          Comparação estritamente interna — sem ranking entre destinos.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EnterpriseRegressionAlertEmail,
  subject: (d: Record<string, any>) =>
    `⚠️ Regressão detectada — ${d?.destinationName ?? 'Diagnóstico'}`,
  displayName: 'Diagnóstico — Alerta de regressão',
  previewData: {
    destinationName: 'Hotel Demonstração',
    diagnosticType: 'enterprise',
    assessmentId: '00000000-0000-0000-0000-000000000000',
    drops: [
      { pillar: 'AO', from: 72, to: 64, drop1: 3.5, drop2: 4.5 },
      { pillar: 'OE', from: 68, to: 62, drop1: 2.8, drop2: 3.2 },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const logoSection = { padding: '8px 0' }
const logoText = { fontSize: '20px', fontWeight: 'bold', color: '#0f766e', margin: 0 }
const divider = { borderColor: '#e5e7eb', margin: '16px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#b45309', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: '0 0 14px' }
const card = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', margin: '10px 0' }
const cardLabel = { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' as const, margin: '6px 0 2px', letterSpacing: '0.5px' }
const cardValue = { fontSize: '14px', color: '#111827', fontWeight: 600 as const, margin: '0 0 4px' }
const cardValueAlert = { fontSize: '16px', color: '#b45309', fontWeight: 700 as const, margin: '0 0 4px' }
const buttonContainer = { textAlign: 'center' as const, margin: '20px 0' }
const button = { backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }
const footer = { fontSize: '12px', color: '#6b7280', margin: '20px 0 0' }