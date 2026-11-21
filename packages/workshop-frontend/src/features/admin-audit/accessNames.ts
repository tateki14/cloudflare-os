import { ADMIN_ACCESS_ERROR_CODES, type AdminAccessRecord, type AdminWorkspaceAccess } from '@gadgets/workshop-shared/api'
import { t } from '../../i18n/moduleIntl'

/** What the Audit tab calls each level of admin access to a workspace or a user's account. */
export const ACCESS_LEVEL_NAMES: Record<AdminWorkspaceAccess, string> = {
  off: 'Off',
  metadata: t({ id: 'accessNames.metadata', defaultMessage: 'Metadata' }),
}

/** What the Audit tab calls each reason an admin call into a workspace or a user's account was
 * refused. */
export const REFUSAL_NAMES: Record<NonNullable<AdminAccessRecord['refused']>, string> = {
  [ADMIN_ACCESS_ERROR_CODES.accessOff]: t({ id: 'accessNames.accessOff', defaultMessage: 'Access off' }),
}
