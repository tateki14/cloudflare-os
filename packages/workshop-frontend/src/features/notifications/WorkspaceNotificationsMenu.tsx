import { DropdownMenu, useKumoToastManager } from '@cloudflare/kumo'
import { Bell, BellSlash } from '@phosphor-icons/react'
import type { NotificationMute } from '@gadgets/workshop-shared/api'
import { useAuthenticatedApi } from '../../AuthContext'
import { MENU_CONTENT, MENU_ITEM, MENU_POSITIONER_STYLE } from '../../components/menuStyles'
import { logRpcFailure } from '../../rpcErrors'
import { describeMute } from './notificationMute'
import { FormattedMessage, useIntl } from 'react-intl'
import { t } from '../../i18n/moduleIntl'

const hoursFromNow = (hours: number): NotificationMute =>
  ({ until: new Date(Date.now() + hours * 60 * 60_000) })

// Each choice computes its mute when picked; "end of day" is the user's next local midnight.
const MUTE_CHOICES: [label: string, mute: () => NotificationMute][] = [
  [t({ id: 'workspaceNotificationsMenu.for1Hour', defaultMessage: 'For 1 hour' }), () => hoursFromNow(1)],
  [t({ id: 'workspaceNotificationsMenu.for3Hours', defaultMessage: 'For 3 hours' }), () => hoursFromNow(3)],
  [t({ id: 'workspaceNotificationsMenu.untilEndOfDay', defaultMessage: 'Until end of day' }), () => {
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)
    return { until: midnight }
  }],
  [t({ id: 'workspaceNotificationsMenu.for1Day', defaultMessage: 'For 1 day' }), () => hoursFromNow(24)],
  [t({ id: 'workspaceNotificationsMenu.for3Days', defaultMessage: 'For 3 days' }), () => hoursFromNow(3 * 24)],
  [t({ id: 'workspaceNotificationsMenu.untilITurnItBackOn', defaultMessage: 'Until I turn it back on' }), () => ({ indefinite: true })],
]

/**
 * A workspace menu's notification control: a "Mute notifications" submenu of durations, or
 * "Unmute notifications" while a mute lasts. A mute silences finished tasks; permission requests
 * still come through. `onMuteChange` is called once the server has stored the change.
 */
export const WorkspaceNotificationsMenu = ({ workspaceId, mute, onMuteChange }: {
  workspaceId: string
  mute?: NotificationMute
  onMuteChange: (mute: NotificationMute | undefined) => void
}) => {
  const { formatMessage } = useIntl()
  const { authenticatedApi } = useAuthenticatedApi()
  const toasts = useKumoToastManager()

  const setMute = async (next: NotificationMute | undefined) => {
    try {
      await authenticatedApi.setWorkspaceNotificationMute(workspaceId, next ?? null)
      onMuteChange(next)
    } catch (error) {
      logRpcFailure('Failed to update workspace notifications:', error)
      toasts.add({ title: formatMessage({ id: 'workspaceNotificationsMenu.failedToUpdateNotifications', defaultMessage: 'Failed to update notifications' }), variant: 'error' })
    }
  }

  if (describeMute(mute)) {
    return (
      <DropdownMenu.Item onClick={() => setMute(undefined)} className={MENU_ITEM}>
        <Bell size={13} /> <FormattedMessage id="workspaceNotificationsMenu.unmuteNotifications" defaultMessage="Unmute notifications" />
      </DropdownMenu.Item>
    )
  }

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={MENU_ITEM}>
        <BellSlash size={13} /> <FormattedMessage id="workspaceNotificationsMenu.muteNotifications" defaultMessage="Mute notifications" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent className={MENU_CONTENT} style={MENU_POSITIONER_STYLE}>
        <DropdownMenu.Group>
          <DropdownMenu.Label className="!px-2.5 !py-1.5 text-[12px] text-kumo-subtle">
            <FormattedMessage id="workspaceNotificationsMenu.stillNotifiesWhenATaskNeeds" defaultMessage="Still notifies when a task needs your permission" />
          </DropdownMenu.Label>
          {MUTE_CHOICES.map(([label, choose]) => (
            <DropdownMenu.Item key={label} onClick={() => setMute(choose())} className={MENU_ITEM}>
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Group>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  )
}
