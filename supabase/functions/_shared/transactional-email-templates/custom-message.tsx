/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface CustomMessageProps {
  userName?: string
  subject?: string
  messageBody?: string
}

const CustomMessageEmail = ({ userName, subject, messageBody }: CustomMessageProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{subject || `Comunicado do ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>{SITE_NAME}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {userName ? `Olá, ${userName}!` : 'Olá!'}
        </Heading>
        {messageBody ? (
          messageBody.split('\n').filter(Boolean).map((paragraph, i) => (
            <Text key={i} style={text}>{paragraph}</Text>
          ))
        ) : (
          <Text style={text}>Você recebeu uma comunicação da equipe {SITE_NAME}.</Text>
        )}
        <Section style={buttonContainer}>
          <Button style={button} href={SITE_URL}>
            Acessar o {SITE_NAME}
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Equipe {SITE_NAME} — Sistema Integrado de Suporte para Turismo em Regiões
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CustomMessageEmail,
  subject: ((data: Record<string, any>) => data.subject || `Comunicado do ${SITE_NAME}`) as (data: Record<string, any>) => string,
  displayName: 'Mensagem personalizada',
  previewData: { userName: 'Maria Silva', subject: 'Atualização importante', messageBody: 'Gostaríamos de informar sobre uma atualização importante na plataforma.\nContinuamos trabalhando para melhorar sua experiência.' },
} satisfies TemplateEntry

const primary = 'hsl(221, 100%, 31%)'
const primaryForeground = '#ffffff'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif",
}
const container = {
  padding: '40px 28px',
  maxWidth: '520px',
  margin: '0 auto',
}
const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '8px',
}
const logoText = {
  fontSize: '24px',
  fontWeight: '800' as const,
  color: primary,
  letterSpacing: '1px',
  margin: '0',
}
const divider = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}
const h1 = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: '#0d0d0d',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
}
const button = {
  backgroundColor: primary,
  color: primaryForeground,
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 32px',
  textDecoration: 'none',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '0',
}
