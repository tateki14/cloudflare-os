import { Tabs } from '@cloudflare/kumo'
import { FormattedMessage, useIntl } from 'react-intl'

/** Which half of the workspace's threads the list shows. */
export type ChatListTab = 'chats' | 'agents'

/**
 * Chats and Agents as peers at the top of the list.
 *
 * The badge counts agents that need the user, not agents in total: it exists to pull someone
 * across from their own conversations, so a number that is simply "how many agents you have"
 * would be on permanently and read never.
 */
export const ChatListTabs = ({ tab, onTabChange, attention }: {
  tab: ChatListTab
  onTabChange: (tab: ChatListTab) => void
  attention: number
}) => {
  const { formatMessage } = useIntl()
  return (
  <Tabs
    size="sm"
    value={tab}
    onValueChange={value => onTabChange(value as ChatListTab)}
    tabs={[
      { value: 'chats', label: formatMessage({ id: 'chatListTabs.chats', defaultMessage: 'Chats' }) },
      {
        value: 'agents',
        label: (
          <span className="flex items-center gap-1.5">
            <FormattedMessage id="chatListTabs.agents" defaultMessage="Agents" />
            {attention > 0 && (
              <span
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-kumo-warning-tint px-1 text-[10.5px] leading-none font-semibold text-kumo-warning"
                aria-label={formatMessage({ id: 'chatListTabs.needingAttention', defaultMessage: '{attention} needing attention' }, { attention: attention })}
              >
                {attention}
              </span>
            )}
          </span>
        ),
      },
    ]}
  />
)
}
