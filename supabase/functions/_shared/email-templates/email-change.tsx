/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração de e-mail — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>{siteName}</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Alteração de e-mail</Heading>
        <Text style={text}>
          Você solicitou a alteração do seu e-mail no {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          para{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Clique no link abaixo para confirmar esta alteração:
        </Text>
        <Section style={buttonContainer}>
          <Link href={confirmationUrl} style={buttonLink}>
            Confirmar Alteração
          </Link>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Se você não solicitou esta alteração, proteja sua conta imediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const primary = 'hsl(221, 100%, 31%)'
const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 28px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = { fontSize: '24px', fontWeight: '800' as const, color: primary, letterSpacing: '1px', margin: '0' }
const divider = { borderColor: '#e5e7eb', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#0d0d0d', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const buttonLink = { backgroundColor: primary, color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '10px', padding: '12px 32px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999999', textAlign: 'center' as const, margin: '0' }
