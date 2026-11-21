import type { IntlShape } from 'react-intl'

/**
 * Relative age in the compact form the activity surfaces use: "just now", "7m ago", "3h ago",
 * "2d ago". Deliberately coarse — these timestamps say how stale something is, not when it
 * happened.
 *
 * Pass `formatMessage` from `useIntl()` to get the localized form; without it the English
 * default is returned (for callers outside a React tree).
 */
export function formatRelativeTime(date: Date, formatMessage?: IntlShape['formatMessage']): string {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(date).getTime()) / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (!formatMessage) {
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }
  if (minutes < 1) return formatMessage({ id: 'relativeTime.justNow', defaultMessage: 'just now' })
  if (minutes < 60) return formatMessage({ id: 'relativeTime.minutes', defaultMessage: '{minutes}m ago' }, { minutes })
  if (hours < 24) return formatMessage({ id: 'relativeTime.hours', defaultMessage: '{hours}h ago' }, { hours })
  return formatMessage({ id: 'relativeTime.days', defaultMessage: '{days}d ago' }, { days })
}
