/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'SISTUR'
const SITE_URL = 'https://sistur.lovable.app'

interface PurchaseConfirmationProps {
  userName?: string
  itemName?: string
  amountLabel?: string
  kind?: 'subscription' | 'credits'
  credits?: number
}

const PurchaseConfirmationEmail = ({ userName, itemName, amountLabel, kind, credits }: PurchaseConfirmationProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Compra confirmada no {SITE_NAME}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>{SITE_NAME}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {userName ? `Obrigado, ${userName}!` : 'Obrigado!'}
        </Heading>
        <Text style={text}>
          Sua compra foi <strong>confirmada</strong> e já está disponível na sua conta.
        </Text>
        <Section style={detailsBox}>
          {itemName && (
            <Text style={detailLine}>
              <strong>Item:</strong> {itemName}
            </Text>
          )}
          {amountLabel && (
            <Text style={detailLine}>
              <strong>Valor:</strong> {amountLabel}
            </Text>
          )}
          {kind === 'credits' && credits ? (
            <Text style={detailLine}>
              <strong>Créditos:</strong> {credits} perguntas ao Professor Beni
            </Text>
          ) : null}
        </Section>
        <Text style={text}>
          {kind === 'credits'
            ? 'Seus créditos já foram adicionados e serão usados automaticamente quando a cota mensal do seu plano terminar.'
            : 'Sua assinatura está ativa e todos os recursos do plano já foram liberados. Você pode gerenciar pagamento e faturas a qualquer momento na página de assinatura.'}
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
  component: PurchaseConfirmationEmail,
  subject: `Compra confirmada no ${SITE_NAME}`,
  displayName: 'Confirmação de compra',
  previewData: { userName: 'Maria Silva', itemName: 'SISTUR Empresarial', amountLabel: 'R$ 149,00/mês', kind: 'subscription' },
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
