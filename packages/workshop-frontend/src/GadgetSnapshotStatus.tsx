import { Badge, Tooltip } from '@cloudflare/kumo'
import { Camera } from '@phosphor-icons/react'
import { formatRelativeTime } from './utils/formatRelativeTime'
import { SnapshotRefreshButton } from './SnapshotRefreshButton'
import { useMinuteTick } from './useMinuteTick'
import { FormattedMessage, useIntl } from 'react-intl'

type Props = {
  refreshedAt: Date
  onRefresh: () => Promise<void>
}

/**
 * Marks the gadget on screen as a static snapshot (see Overseer.getGadgetSnapshot), saying when it
 * was taken, with a control to take a new snapshot.
 */
export const GadgetSnapshotStatus = ({ refreshedAt, onRefresh }: Props) => {
  const { formatMessage } = useIntl()
  useMinuteTick()

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {/* Badge forwards no ref, so a focusable span carries the tooltip. */}
      <Tooltip content={formatMessage({ id: 'gadgetSnapshotStatus.updated', defaultMessage: 'Updated {relativeTime}' }, { relativeTime: formatRelativeTime(refreshedAt) })} asChild>
        <span tabIndex={0} className="inline-flex rounded-full">
          <Badge variant="secondary" icon={<Camera size={12} />}><FormattedMessage id="gadgetSnapshotStatus.snapshot" defaultMessage="Snapshot" /></Badge>
        </span>
      </Tooltip>
      <SnapshotRefreshButton onRefresh={onRefresh} />
    </div>
  )
}
