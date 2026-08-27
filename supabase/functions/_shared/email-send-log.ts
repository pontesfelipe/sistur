import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  sendTemplateEmail,
  type SendTemplateEmailOptions,
  type SendTemplateEmailResult,
} from './transactional-email-templates/send-email.ts'

/**
 * Sends a registered template through Lovable's managed email API and records
 * the outcome in the app's `email_send_log` audit table.
 *
 * Delivery, retries, rate limits, suppression and unsubscribe are handled by
 * Lovable — this log is an app-side audit trail only and never gates a send.
 */
export async function sendTemplateEmailWithLog(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const log = async (status: 'sent' | 'suppressed' | 'failed', errorMessage?: string) => {
    const { error } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: templateName,
      recipient_email: to,
      status,
      error_message: errorMessage ?? null,
    })
    if (error) {
      console.error('Failed to write email_send_log row', {
        status,
        template_name: templateName,
        code: error.code,
        message: error.message,
      })
    }
  }

  try {
    const result = await sendTemplateEmail(templateName, to, options)
    await log(result.sent ? 'sent' : 'suppressed')
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown send error'
    await log('failed', message)
    throw error
  }
}
