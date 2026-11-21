import { Badge } from '@cloudflare/kumo'
import type { AdminAuditKind } from '@gadgets/workshop-shared/api'
import { t } from '../../i18n/moduleIntl'

/** What the Audit tab calls each kind of record. */
export const KIND_NAMES: Record<AdminAuditKind, string> = {
  workspace: t({ id: 'kindBadge.workspaceAccess', defaultMessage: 'Workspace access' }),
  user: t({ id: 'kindBadge.userAccess', defaultMessage: 'User access' }),
  write: t({ id: 'kindBadge.workspaceWrite', defaultMessage: 'Workspace write' }),
  setting: t({ id: 'kindBadge.settingChange', defaultMessage: 'Setting change' }),
}

const VARIANTS = {
  workspace: 'neutral', user: 'neutral', write: 'orange', setting: 'outline',
} as const

/** A record's kind, as a badge: only a write's is colored, so writes stand out. */
export const KindBadge = ({ kind }: { kind: AdminAuditKind }) => (
  <Badge variant={VARIANTS[kind]}>{KIND_NAMES[kind]}</Badge>
)
