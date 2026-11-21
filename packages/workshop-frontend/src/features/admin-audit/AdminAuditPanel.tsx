import { useEffect, useId, useRef, useState } from 'react'
import { Button, Loader, Select, Table, useKumoToastManager } from '@cloudflare/kumo'
import { ArrowsClockwise } from '@phosphor-icons/react'
import type { RpcStub } from 'capnweb'
import { ADMIN_WORKSPACE_ACCESS_LEVELS, MAX_ADMIN_AUDIT_RETENTION_DAYS } from '@gadgets/workshop-shared/api'
import type { AdminApi, AdminAuditStats, AdminWorkspaceAccess } from '@gadgets/workshop-shared/api'
import { DurationSetting } from '../../components/DurationSetting'
import { logRpcFailure, rpcFailureDescription } from '../../rpcErrors'
import { ACCESS_LEVEL_NAMES } from './accessNames'
import type { AuditFilter } from './auditFilter'
import { AuditLog } from './AuditLog'
import type { AuditSettings } from './auditSettings'
import { FormattedMessage, useIntl } from 'react-intl'

type AdminAuditPanelProps = {
  admin: RpcStub<AdminApi>
  /** What the server last reported. */
  settings: AuditSettings
  /**
   * Re-reads the settings after a change, so that the panel shows what the server holds. Rejects
   * when the re-read failed.
   */
  onSettingsChanged: () => Promise<void>
  /** The log's filters, which the admin page keeps in its URL. */
  filter: AuditFilter
  onFilterChange: (filter: AuditFilter) => void
}

const CARD = 'bg-kumo-elevated border border-kumo-line rounded-xl p-6'
const ACCESS_LABEL = 'Inspection access'
const RETENTION_LABEL = 'Keep audit records for (days)'
const STATS_DAYS = 7

const NUMBER = new Intl.NumberFormat('en')

// A UTC day (YYYY-MM-DD), named as a date. The stats count UTC days, so it is read in UTC.
const DAY = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const dayName = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? day : DAY.format(date)
}

// The answer to one load of the statistics, for the value of `loads` it answered.
type StatsAnswer = { loads: number } & ({ stats: AdminAuditStats } | { failed: true })

// The window's writes to workspaces. The router can serve this frontend beside a backend older
// than admin writes, whose statistics count none: nothing is shown then, rather than a figure the
// backend never gave.
const Writes = ({ count }: { count: unknown }) => {
  const { formatMessage } = useIntl()
  return typeof count !== 'number' ? null : (
  <span className="block mt-1">
    {NUMBER.format(count)} {count === 1 ? formatMessage({ id: 'adminAuditPanel.write', defaultMessage: 'write' }) : formatMessage({ id: 'adminAuditPanel.writes', defaultMessage: 'writes' })}
  </span>
)
}

const StatsCards = ({ stats, onFilterBy }: {
  stats: AdminAuditStats
  onFilterBy: (filter: AuditFilter) => void
}) => {
  const { formatMessage } = useIntl()
  return (
  <div className="grid items-start gap-6 lg:grid-cols-2">
    <div className={CARD}>
      <h3 className="text-lg font-semibold text-kumo-strong mb-1"><FormattedMessage id="adminAuditPanel.adminActionsLastDays" defaultMessage="Admin actions, last {days} days" values={{ days: stats.days }} /></h3>
      <p className="text-sm text-kumo-subtle mb-4">
        <span className="text-2xl font-semibold text-kumo-default tabular-nums">{NUMBER.format(stats.totalEvents)}</span>
        {' '}<FormattedMessage id="adminAuditPanel.byUtcDay" defaultMessage="{value}, by UTC day" values={{ value: stats.totalEvents === 1 ? formatMessage({ id: 'adminAuditPanel.action', defaultMessage: 'action' }) : formatMessage({ id: 'adminAuditPanel.actions', defaultMessage: 'actions' }) }} />
        <Writes count={stats.writes} />
      </p>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head><FormattedMessage id="adminAuditPanel.day" defaultMessage="Day" /></Table.Head>
            <Table.Head className="text-right"><FormattedMessage id="adminAuditPanel.actions2" defaultMessage="Actions" /></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {stats.byDay.map(({ day, count }) => (
            <Table.Row key={day}>
              <Table.Cell><time dateTime={day}>{dayName(day)}</time></Table.Cell>
              <Table.Cell className="text-right tabular-nums">{NUMBER.format(count)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>

    <div className={CARD}>
      <h3 className="text-lg font-semibold text-kumo-strong mb-1"><FormattedMessage id="adminAuditPanel.mostActiveAdmins" defaultMessage="Most active admins" /></h3>
      <p className="text-sm text-kumo-subtle mb-4">
        <FormattedMessage id="adminAuditPanel.byActionsInTheLastDays" defaultMessage="By actions in the last {days} days. Choose an admin to see only their activity." values={{ days: stats.days }} />
      </p>
      {stats.topAdmins.length === 0
        ? <p className="text-sm text-kumo-subtle"><FormattedMessage id="adminAuditPanel.noAdminActivityInThisWindow" defaultMessage="No admin activity in this window." /></p>
        : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head><FormattedMessage id="adminAuditPanel.admin" defaultMessage="Admin" /></Table.Head>
                <Table.Head className="text-right"><FormattedMessage id="adminAuditPanel.actions2" defaultMessage="Actions" /></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {stats.topAdmins.map(({ admin, count }) => (
                <Table.Row key={admin}>
                  <Table.Cell className="max-w-0 w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 max-w-full text-base"
                      aria-label={formatMessage({ id: 'adminAuditPanel.showOnlySActivity', defaultMessage: 'Show only {admin}’s activity' }, { admin: admin })}
                      onClick={() => onFilterBy({ admin })}
                    >
                      <span className="truncate">{admin}</span>
                    </Button>
                  </Table.Cell>
                  <Table.Cell className="text-right tabular-nums">{NUMBER.format(count)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
    </div>
  </div>
)
}

const accessHelp = ({ chosen, effective, max }: AuditSettings['adminWorkspaceAccess']): string[] => {
  const help = [
    'Whether an admin may inspect a workspace or a user’s account. Metadata shows a workspace’s ' +
      'structure and withholds chat messages, messages queued for an agent, attachments, file ' +
      'contents, commit messages, the arguments of calls queued for an agent, the configuration ' +
      'an agent suggested for a connection, which blueprint a gadget follows, the ids of the ' +
      'blueprints a workspace publishes, and the descriptions and fields of actions, ' +
      'observations and hooks. Titles, file names, commit authors, share links’ notes, blueprint ' +
      'descriptions, and the names and hashes of attachments stay, and can echo content. Of a ' +
      'user’s account, Metadata withholds what each connected account’s gatekeeper says of it ' +
      '(its names, avatar and what it grants) and the ids of the user’s blueprints. Off refuses ' +
      'inspection, and reaches views already open within about a minute.',
  ]
  if (max === 'off') {
    help.push('This deployment’s ADMIN_WORKSPACE_ACCESS_MAX allows no inspection (a value that is ' +
      'not a level counts as off).')
  }
  if (chosen !== effective) {
    help.push(`The level set here is ${ACCESS_LEVEL_NAMES[chosen]}, which that maximum limits to ` +
      `${ACCESS_LEVEL_NAMES[effective]}. Choose ${ACCESS_LEVEL_NAMES[effective]} to set it here, ` +
      'so that a higher maximum does not raise it.')
  }
  return help
}

const accessRank = (level: AdminWorkspaceAccess) => ADMIN_WORKSPACE_ACCESS_LEVELS.indexOf(level)

/**
 * The admin Audit tab: what the deployment-wide admin audit log holds for the last week, the log
 * itself, filtered and a page at a time, and the settings that bound admin access to workspaces and
 * users' accounts, and the log's retention.
 */
export const AdminAuditPanel = ({ admin, settings, onSettingsChanged, filter, onFilterChange }: AdminAuditPanelProps) => {
  const { formatMessage } = useIntl()
  const toasts = useKumoToastManager()
  // Each load is one value of this; a new one supersedes those before it.
  const [loads, setLoads] = useState(0)
  const [statsAnswer, setStatsAnswer] = useState<StatsAnswer | null>(null)
  const [savingAccess, setSavingAccess] = useState(false)
  const activityHeading = useId()
  const logHeading = useId()
  const { adminWorkspaceAccess: access, adminAuditRetentionDays: retention } = settings

  useEffect(() => {
    let current = true
    admin.getAdminAuditStats({ days: STATS_DAYS }).then(
      (stats) => { if (current) setStatsAnswer({ loads, stats }) },
      (err: unknown) => {
        if (!current) return
        logRpcFailure('Failed to load the admin audit statistics:', err)
        setStatsAnswer({ loads, failed: true })
      },
    )
    return () => { current = false }
  }, [admin, loads])

  // Shown statistics stay until the load that replaces them answers.
  const stats = statsAnswer !== null && 'stats' in statsAnswer ? statsAnswer.stats : null
  const refreshing = statsAnswer?.loads !== loads
  const statsFailed = statsAnswer !== null && 'failed' in statsAnswer && !refreshing
  const reload = () => setLoads((n) => n + 1)
  // Each settings change is one value of this, which sends the log back to its newest page.
  const [changes, setChanges] = useState(0)

  // The access select is disabled while its change is in flight, and a browser takes focus from a
  // control that becomes disabled without giving it back. So its trigger gets focus again once the
  // change settles, unless focus has gone elsewhere since. The trigger, not the control focused
  // when the change began: a choice by keyboard is made from an option of the popup, which is gone
  // by then. Kumo's Select hands out no ref to its trigger, so it is found through this wrapper.
  const accessField = useRef<HTMLDivElement>(null)
  const refocusAccess = useRef(false)
  useEffect(() => {
    if (savingAccess || !refocusAccess.current) return
    refocusAccess.current = false
    if (document.activeElement === document.body) {
      accessField.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus()
    }
  }, [savingAccess])

  const reportFailure = (title: string, err: unknown) => {
    logRpcFailure(`${title}:`, err)
    toasts.add({ title, description: rpcFailureDescription(err), variant: 'error' })
  }

  // Resolves whether `op` went through and the settings were re-read after it. Once it went
  // through, the log is loaded again so that the change's own record shows.
  const change = async (failureTitle: string, op: () => Promise<unknown>): Promise<boolean> => {
    try {
      await op()
    } catch (err) {
      reportFailure(failureTitle, err)
      return false
    }
    reload()
    setChanges((n) => n + 1)
    try {
      await onSettingsChanged()
      return true
    } catch (err) {
      reportFailure(formatMessage({ id: 'adminAuditPanel.couldntReloadTheAdminSettings', defaultMessage: 'Couldn’t reload the admin settings' }), err)
      return false
    }
  }

  const changeAccess = async (level: AdminWorkspaceAccess) => {
    // Against the stored choice, not the level shown: picking the shown level again while the
    // maximum holds a higher choice down makes it the admins' choice, which a later rise of
    // ADMIN_WORKSPACE_ACCESS_MAX then cannot raise.
    if (level === access.chosen) return
    refocusAccess.current = true
    setSavingAccess(true)
    try {
      await change(formatMessage({ id: 'adminAuditPanel.couldntUpdate', defaultMessage: 'Couldn’t update “{ACCESS_LABEL}”' }, { ACCESS_LABEL: ACCESS_LABEL }), () => admin.setAdminWorkspaceAccess(level))
    } finally {
      setSavingAccess(false)
    }
  }

  const filterBy = (added: AuditFilter) => onFilterChange({ ...filter, ...added })

  return (
    <div className="space-y-6">
      <section className="space-y-6" aria-labelledby={activityHeading}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 id={activityHeading} className="text-lg font-semibold text-kumo-strong"><FormattedMessage id="adminAuditPanel.adminActivity" defaultMessage="Admin activity" /></h2>
            <p className="text-sm text-kumo-subtle mt-0.5">
              <FormattedMessage id="adminAuditPanel.everyChangeAnAdminMakesTo" defaultMessage="Every change an admin makes to the deployment’s settings, every admin call into a workspace or a user’s account, and every admin write to a workspace, kept for {value} days." values={{ value: NUMBER.format(retention.effective) }} />
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowsClockwise}
            loading={refreshing && stats !== null}
            disabled={refreshing}
            onClick={reload}
          >
            <FormattedMessage id="adminAuditPanel.refresh" defaultMessage="Refresh" />
          </Button>
        </div>

        {stats === null && !statsFailed && (
          <div className="flex justify-center py-16">
            <Loader size="lg" />
          </div>
        )}
        {statsFailed && (
          <div className={`${CARD} text-center`}>
            <p role="alert" className="text-sm text-kumo-danger"><FormattedMessage id="adminAuditPanel.couldntLoadTheAdminAuditStatistics" defaultMessage="Couldn’t load the admin audit statistics." /></p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={reload}><FormattedMessage id="adminAuditPanel.retry" defaultMessage="Retry" /></Button>
          </div>
        )}
        {stats !== null && !statsFailed && <StatsCards stats={stats} onFilterBy={filterBy} />}

        <section className={CARD} aria-labelledby={logHeading}>
          <h3 id={logHeading} className="text-lg font-semibold text-kumo-strong mb-4"><FormattedMessage id="adminAuditPanel.activityLog" defaultMessage="Activity log" /></h3>
          <AuditLog
            admin={admin}
            filter={filter}
            onFilterChange={onFilterChange}
            adminSuggestions={stats?.topAdmins.map(({ admin: name }) => name) ?? []}
            reloads={loads}
            restarts={changes}
          />
        </section>
      </section>

      <div className={CARD}>
        <h2 className="text-lg font-semibold text-kumo-strong mb-4">{ACCESS_LABEL}</h2>
        <div ref={accessField}>
          <Select<AdminWorkspaceAccess>
            label={formatMessage({ id: 'adminAuditPanel.accessLevel', defaultMessage: 'Access level' })}
            value={access.effective}
            disabled={savingAccess}
            onValueChange={(level) => { if (level !== null) void changeAccess(level) }}
            renderValue={(level) => ACCESS_LEVEL_NAMES[level]}
            description={(
              <span className="block space-y-1">
                {accessHelp(access).map((text) => <span key={text} className="block">{text}</span>)}
              </span>
            )}
          >
            {ADMIN_WORKSPACE_ACCESS_LEVELS.map((level) => (
              <Select.Option key={level} value={level} disabled={accessRank(level) > accessRank(access.max)}>
                {ACCESS_LEVEL_NAMES[level]}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>

      <div className={CARD}>
        <h2 className="text-lg font-semibold text-kumo-strong mb-4"><FormattedMessage id="adminAuditPanel.auditRetention" defaultMessage="Audit retention" /></h2>
        {retention.chosen < retention.min && (
          <p className="text-sm text-kumo-subtle mb-4">
            <FormattedMessage id="adminAuditPanel.theRetentionSetHereIsDays" defaultMessage="The retention set here is {value} days, so this deployment’s minimum of {value2} days is what holds it up. If a deploy lowers or removes ADMIN_AUDIT_RETENTION_MIN_DAYS, as a deploy tool that writes the backend’s variables without it does, {value3} days applies again. To keep a retention either way, type the number of days and save it, even the minimum." values={{ value: NUMBER.format(retention.chosen), value2: NUMBER.format(retention.min), value3: NUMBER.format(retention.chosen) }} />
          </p>
        )}
        <div className="max-w-md">
          <DurationSetting
            label={RETENTION_LABEL}
            help={
              formatMessage({ id: 'adminAuditPanel.howLongTheAdminAuditLog', defaultMessage: 'How long the admin audit log keeps a record. This deployment keeps at least {value} days, which its ADMIN_AUDIT_RETENTION_MIN_DAYS variable sets.' }, { value: NUMBER.format(retention.min) })
            }
            unit="days"
            min={retention.min}
            max={MAX_ADMIN_AUDIT_RETENTION_DAYS}
            value={retention.effective}
            onSave={(days) =>
              change(formatMessage({ id: 'adminAuditPanel.couldntUpdate2', defaultMessage: 'Couldn’t update “{RETENTION_LABEL}”' }, { RETENTION_LABEL: RETENTION_LABEL }), () => admin.setAdminAuditRetentionDays(days))}
          />
        </div>
      </div>
    </div>
  )
}
