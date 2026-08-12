import { Badge } from '@cloudflare/kumo'
import { Text } from '@cloudflare/kumo'
import { Circle } from '@phosphor-icons/react'
import { FormattedMessage, useIntl } from 'react-intl'
import { sampleDataRows } from '../../data/chat'

/**
 * App tab = live preview of the running app.
 * This renders a mock of what the deployed Slack summarizer looks like.
 */
export default function AppPreview() {
  const { formatMessage } = useIntl()
  return (
    <div className="flex flex-col h-full bg-kumo-base">
      {/* App content */}
      <div className="flex-1 overflow-auto p-6">
        {/* App header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Text variant="heading2" as="h1">
              <FormattedMessage id="appPreview.title" defaultMessage="Channel Summarizer" />
            </Text>
            <p className="text-sm text-kumo-subtle mt-1">
              <FormattedMessage
                id="appPreview.subtitle"
                defaultMessage="Daily digest of your Slack channels, powered by Workers AI"
              />
            </p>
          </div>
          <Badge variant="success">
            <FormattedMessage id="appPreview.liveBadge" defaultMessage="Live" />
          </Badge>
        </div>

        {/* Channel cards */}
        <div className="grid gap-3">
          {sampleDataRows.filter(r => r.unread).map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-kumo-line bg-kumo-base p-4 hover:bg-kumo-elevated transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-kumo-default">{row.channel}</span>
                  <Badge variant="primary">
                    {formatMessage(
                      { id: 'appPreview.messagesCount', defaultMessage: '{count, plural, one {# msg} other {# msgs}}' },
                      { count: row.messages },
                    )}
                  </Badge>
                </div>
                <span className="text-xs text-kumo-subtle">{row.lastActive}</span>
              </div>
              {/* Fake summary */}
              <div className="space-y-1.5 mt-3">
                <div className="flex items-start gap-2">
                  <Circle size={5} className="text-kumo-subtle mt-1.5 flex-shrink-0" weight="fill" />
                  <p className="text-sm text-kumo-subtle">
                    {row.channel === '#general'
                      ? <FormattedMessage
                          id="appPreview.summaryGeneralPlanning"
                          defaultMessage="Team discussed Q1 planning timeline and agreed on March 15 deadline for proposals"
                        />
                      : row.channel === '#engineering'
                        ? <FormattedMessage
                            id="appPreview.summaryEngineeringDeploy"
                            defaultMessage="Deployed v2.4.1 hotfix for auth timeout. Monitoring dashboards show latency back to normal"
                          />
                        : <FormattedMessage
                            id="appPreview.summaryOtherHackathon"
                            defaultMessage="Active discussion about weekend hackathon projects and lunch plans for Friday"
                          />}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Circle size={5} className="text-kumo-subtle mt-1.5 flex-shrink-0" weight="fill" />
                  <p className="text-sm text-kumo-subtle">
                    {row.channel === '#general'
                      ? <FormattedMessage id="appPreview.summaryGeneralActionItems" defaultMessage="3 action items assigned, 2 decisions made" />
                      : row.channel === '#engineering'
                        ? <FormattedMessage
                            id="appPreview.summaryEngineeringRfc"
                            defaultMessage="RFC for new caching layer received 5 approvals, moving to implementation"
                          />
                        : <FormattedMessage
                            id="appPreview.summaryOtherParticipants"
                            defaultMessage="12 participants, trending topics: hackathon, team lunch, offsite"
                          />}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quiet channels */}
        <div className="mt-6">
          <div className="text-xs font-semibold text-kumo-subtle uppercase tracking-wider mb-3">
            <FormattedMessage id="appPreview.noNewActivity" defaultMessage="No new activity" />
          </div>
          <div className="flex flex-wrap gap-2">
            {sampleDataRows.filter(r => !r.unread).map((row) => (
              <div key={row.id} className="px-3 py-1.5 rounded-md bg-kumo-tint">
                <span className="font-mono text-xs text-kumo-subtle">{row.channel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
