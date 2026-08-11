import { Switch, Tooltip } from '@cloudflare/kumo'
import { useIntl } from 'react-intl'

interface HookToggleProps {
  enabled: boolean
  disabled?: boolean
  onToggle: (enabled: boolean) => void
  size?: 'sm' | 'base' | 'lg'
}

// Enable/disable toggle for bound hooks. Used in the Connections tab, Activity log, and inline chat.
export function HookToggle({ enabled, disabled = false, onToggle, size = 'sm' }: HookToggleProps) {
  const { formatMessage } = useIntl()
  return (
    <Tooltip
      content={enabled
        ? formatMessage({ id: 'hookToggle.disableThisHook', defaultMessage: 'Disable this hook.' })
        : formatMessage({ id: 'hookToggle.enableThisHook', defaultMessage: 'Enable this hook.' })}
      asChild
    >
      <span className="inline-flex items-center">
        <Switch
          checked={enabled}
          disabled={disabled}
          size={size}
          onCheckedChange={(checked) => onToggle(checked)}
          aria-label={enabled
            ? formatMessage({ id: 'hookToggle.disableHook', defaultMessage: 'Disable hook' })
            : formatMessage({ id: 'hookToggle.enableHook', defaultMessage: 'Enable hook' })}
        />
      </span>
    </Tooltip>
  )
}
