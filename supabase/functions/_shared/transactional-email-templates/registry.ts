/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as accessApproved } from './access-approved.tsx'
import { template as accessRequested } from './access-requested.tsx'
import { template as customMessage } from './custom-message.tsx'
import { template as eduLevelUp } from './edu-level-up.tsx'
import { template as eduBadgeEarned } from './edu-badge-earned.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'access-approved': accessApproved,
  'access-requested': accessRequested,
  'custom-message': customMessage,
  'edu-level-up': eduLevelUp,
  'edu-badge-earned': eduBadgeEarned,
}
