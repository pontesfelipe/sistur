/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu link de acesso ao {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>{siteName}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Seu link de acesso</Heading>
        <Text style={text}>
          Clique no botão abaixo para entrar no {siteName}. Este link expira em breve.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={confirmationUrl}>
            Acessar {siteName}
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Se você não solicitou este link, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const primary = 'hsl(221, 100%, 31%)'
const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 28px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = { fontSize: '24px', fontWeight: '800' as const, color: primary, letterSpacing: '1px', margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0d0d0d', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: primary, color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '12px 32px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '0' }
