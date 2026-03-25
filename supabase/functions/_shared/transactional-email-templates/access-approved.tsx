/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface AccessApprovedProps {
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

const AccessApprovedEmail = ({ userName, role, systemAccess }: AccessApprovedProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso ao {SITE_NAME} foi aprovado!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>{SITE_NAME}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {userName ? `Olá, ${userName}!` : 'Olá!'}
        </Heading>
        <Text style={text}>
          Temos boas notícias — sua solicitação de acesso ao <strong>{SITE_NAME}</strong> foi <strong>aprovada</strong>.
        </Text>
        {(role || systemAccess) && (
          <Section style={detailsBox}>
            {systemAccess && (
              <Text style={detailLine}>
                <strong>Sistema:</strong> {systemLabels[systemAccess] || systemAccess}
              </Text>
            )}
            {role && (
              <Text style={detailLine}>
                <strong>Perfil:</strong> {roleLabels[role] || role}
              </Text>
            )}
          </Section>
        )}
        <Text style={text}>
          Você já pode acessar a plataforma e começar a utilizar todas as funcionalidades disponíveis para o seu perfil.
        </Text>
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
  component: AccessApprovedEmail,
  subject: `Seu acesso ao ${SITE_NAME} foi aprovado!`,
  displayName: 'Aprovação de acesso',
  previewData: { userName: 'Maria Silva', role: 'ANALYST', systemAccess: 'ERP' },
} satisfies TemplateEntry

// Styles — Instituto Mario Beni brand: deep blue primary
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
