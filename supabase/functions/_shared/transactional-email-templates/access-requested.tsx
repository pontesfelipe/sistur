/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { tt, trAmount, normalizeLang } from './i18n.ts'

const SITE_NAME = 'SISTUR'

interface AccessRequestedProps {
  userName?: string
  role?: string
  systemAccess?: string
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
  ESTUDANTE: 'Estudante',
  PROFESSOR: 'Professor',
}

const systemLabels: Record<string, string> = {
  ERP: 'ERP — Diagnóstico e Gestão',
  EDU: 'EDU — Educação e Capacitação',
}

const AccessRequestedEmail = ({ userName, role, systemAccess, language }: AccessRequestedProps & { language?: string }) => (
  <Html lang={normalizeLang(language)} dir="ltr">
    <Head />
    <Preview>{tt(language, 'Recebemos sua solicitação de acesso ao SISTUR')}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>{SITE_NAME}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {userName ? tt(language, 'Olá, {name}!', { name: userName }) : tt(language, 'Olá!')}
        </Heading>
        <Text style={text}>
          {tt(language, 'Recebemos sua solicitação de acesso ao SISTUR. Obrigado pelo seu interesse!')}
        </Text>

        {(role || systemAccess) && (
          <Section style={detailsBox}>
            {systemAccess && (
              <Text style={detailLine}>
                <strong>{tt(language, 'Sistema solicitado:')}</strong> {systemLabels[systemAccess] ? tt(language, systemLabels[systemAccess]) : systemAccess}
              </Text>
            )}
            {role && (
              <Text style={detailLine}>
                <strong>{tt(language, 'Perfil solicitado:')}</strong> {roleLabels[role] ? tt(language, roleLabels[role]) : role}
              </Text>
            )}
          </Section>
        )}

        <Section style={noticeBox}>
          <Text style={noticeTitle}>{tt(language, '🚧 Plataforma em Construção')}</Text>
          <Text style={noticeText}>
            {tt(language, 'O SISTUR está em fase de desenvolvimento ativo. Algumas funcionalidades podem estar em construção ou sofrer alterações. Estamos trabalhando para oferecer a melhor experiência possível.')}
          </Text>
        </Section>

        <Text style={text}>
          {tt(language, 'Sua solicitação será analisada pela nossa equipe. Assim que seu acesso for liberado, você receberá um e-mail de confirmação com os próximos passos.')}
        </Text>

        <Text style={text}>
          {tt(language, 'Enquanto isso, fique à vontade para explorar nosso conteúdo público ou entrar em contato caso tenha alguma dúvida.')}
        </Text>

        <Hr style={divider} />
        <Text style={footer}>
          {tt(language, 'Equipe SISTUR — Sistema Integrado de Suporte para Turismo em Regiões')}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccessRequestedEmail,
  subject: (d: Record<string, any>) => tt(d?.language, 'Recebemos sua solicitação de acesso ao SISTUR'),
  displayName: 'Solicitação de acesso recebida',
  previewData: { userName: 'Maria Silva', role: 'ESTUDANTE', systemAccess: 'EDU' },
} satisfies TemplateEntry

// Styles — Instituto Mario Beni brand: deep blue primary
const primary = 'hsl(221, 100%, 31%)'

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
const detailsBox = {
  backgroundColor: '#f4f6fa',
  borderRadius: '10px',
  padding: '16px 20px',
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
}
const detailLine = {
  fontSize: '14px',
  color: '#333',
  margin: '4px 0',
  lineHeight: '1.5',
}
const noticeBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '10px',
  padding: '16px 20px',
  marginBottom: '20px',
  border: '1px solid #fde68a',
}
const noticeTitle = {
  fontSize: '15px',
  fontWeight: '700' as const,
  color: '#92400e',
  margin: '0 0 8px',
}
const noticeText = {
  fontSize: '14px',
  color: '#78350f',
  lineHeight: '1.5',
  margin: '0',
}
const footer = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '0',
}
