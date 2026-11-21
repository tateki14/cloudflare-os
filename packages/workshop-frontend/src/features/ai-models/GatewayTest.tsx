import { Button } from '@cloudflare/kumo'
import type { GatewayModelLevelTest, GatewayModelTest } from '@gadgets/workshop-shared/api'
import { REASONING_LEVEL_LABELS } from './modelForm'
import type { GatewayTestState } from './useGatewayTests'
import { FormattedMessage, useIntl } from 'react-intl'

/**
 * The button that runs a gateway test. A test in flight leaves it enabled, because a browser takes
 * focus from a button that becomes disabled; `useGatewayTests` ignores a press until the test
 * answers.
 */
export const GatewayTestButton = ({ name, testing, onTest, size = 'sm' }: {
  /** What the test is of, which the button's accessible name says. */
  name: string
  testing: boolean
  onTest: () => void
  /** A row's button is small. One beside a form's submit button is that button's size. */
  size?: 'sm' | 'base'
}) => {
  const { formatMessage } = useIntl()
  return (
  <Button
    type="button"
    variant="secondary"
    size={size}
    className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    aria-label={testing ? formatMessage({ id: 'gatewayTest.testing2', defaultMessage: 'Testing {name}…' }, { name: name }) : formatMessage({ id: 'gatewayTest.test2', defaultMessage: 'Test {name}' }, { name: name })}
    aria-disabled={testing}
    onClick={() => onTest()}
  >
    {testing ? formatMessage({ id: 'gatewayTest.testing', defaultMessage: 'Testing…' }) : formatMessage({ id: 'gatewayTest.test', defaultMessage: 'Test' })}
  </Button>
)
}

const STATUS_REGION = 'break-words text-xs leading-4'

const resultColor = (result: GatewayModelTest) =>
  (result.ok ? 'text-kumo-success' : 'text-kumo-danger')

// What one request found, in words. A provider's test asks one of the provider's models, which a
// pass names; a pass of the Auto Router model names the gateway model that answered.
const resultWording = (result: GatewayModelTest, subject: 'provider' | 'model') => {
  if (!result.ok) {
    return <><FormattedMessage id="gatewayTest.failed" defaultMessage="Failed" />{result.status !== undefined && ` (${result.status})`}:{' '}{result.message}</>
  }
  const via = result.routedModel !== undefined && (
    <> via <span className="font-mono">{result.routedModel}</span></>
  )
  return subject === 'provider' ? (
    <><FormattedMessage id="gatewayTest.answeredThroughTheGateway" defaultMessage="<span>{model}</span> answered through the gateway{via}." values={{ model: result.model, span: (chunks) => <span className="font-mono">{chunks}</span>, via: via }} /></>
  ) : (
    <><FormattedMessage id="gatewayTest.answeredThroughTheGateway2" defaultMessage="Answered through the gateway{via}." values={{ via: via }} /></>
  )
}

// Whether the request was refused as unauthorized or forbidden, which the hint gives the likely
// reasons for.
const unauthorized = (result: GatewayModelTest) =>
  !result.ok && (result.status === 401 || result.status === 403)

const UnauthorizedHint = () => (
  <p className="mt-1 text-kumo-subtle">
    <FormattedMessage id="gatewayTest.theGatewayMayHoldNoKey" defaultMessage="The gateway may hold no key or credits for this provider, or <code>CF_AI_GATEWAY_API_TOKEN</code> may not be allowed to run models." values={{ code: (chunks) => <code className="font-mono">{chunks}</code> }} />
  </p>
)

const NotRun = ({ reason }: { reason: string | undefined }) => (
  <p className="mt-2 text-kumo-danger">
    <FormattedMessage id="gatewayTest.couldntRunTheTest" defaultMessage="Couldn’t run the test{value}" values={{ value: reason === undefined ? '.' : `: ${reason}` }} />
  </p>
)

/**
 * What a gateway test answered. The region is rendered before any test is run, and is empty until
 * one answers, so that the answer is announced.
 */
export const GatewayTestStatus = ({ test, subject }: {
  /** Where the last test stands. Absent until one is run. */
  test: GatewayTestState | undefined
  /**
   * What the test is of. A provider's test asks one of the provider's models, which a pass names;
   * a model's test asks the model whose row the result is in.
   */
  subject: 'provider' | 'model'
}) => (
  <div role="status" className={STATUS_REGION}>
    {test?.state === 'answered' && (
      <>
        <p className={`mt-2 ${resultColor(test.result)}`}>{resultWording(test.result, subject)}</p>
        {unauthorized(test.result) && <UnauthorizedHint />}
      </>
    )}
    {test?.state === 'not-run' && <NotRun reason={test.reason} />}
  </div>
)

/**
 * What the test of a model at each of its reasoning levels answered: a line per request, in the
 * order the server gave them, each under the level it asked for. The region is rendered before
 * any test is run, and is empty until one answers, so that the answer is announced.
 */
export const GatewayLevelTestsStatus = ({ test }: {
  /** Where the last test stands. Absent until one is run. */
  test: GatewayTestState<GatewayModelLevelTest[]> | undefined
}) => {
  const { formatMessage } = useIntl()
  return (
  <div role="status" className={STATUS_REGION}>
    {test?.state === 'answered' && (
      <>
        <ul className="mt-2 flex flex-col gap-1">
          {test.result.map((result) => (
            <li key={result.reasoning ?? 'none'} className={resultColor(result)}>
              <span className="font-medium text-kumo-default">
                {result.reasoning === null ? formatMessage({ id: 'gatewayTest.noLevelSet', defaultMessage: 'No level set' }) : REASONING_LEVEL_LABELS[result.reasoning]}
              </span>
              : {resultWording(result, 'model')}
            </li>
          ))}
        </ul>
        {test.result.some(unauthorized) && <UnauthorizedHint />}
      </>
    )}
    {test?.state === 'not-run' && <NotRun reason={test.reason} />}
  </div>
)
}
