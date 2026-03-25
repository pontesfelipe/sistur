/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação — SISTUR</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>SISTUR</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Código de verificação</Heading>
        <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Section style={codeContainer}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Este código expira em breve. Se você não solicitou, ignore este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const primary = 'hsl(221, 100%, 31%)'
const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 28px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = { fontSize: '24px', fontWeight: '800' as const, color: primary, letterSpacing: '1px', margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0d0d0d', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const codeContainer = { textAlign: 'center' as const, margin: '24px 0', backgroundColor: '#f4f6fa', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }
const codeStyle = { fontFamily: "'Courier New', Courier, monospace", fontSize: '28px', fontWeight: '800' as const, color: primary, margin: '0', letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '0' }
