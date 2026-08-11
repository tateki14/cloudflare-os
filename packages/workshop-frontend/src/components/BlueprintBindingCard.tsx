import { Checkbox } from '@cloudflare/kumo'
import type { RpcStub } from 'capnweb'
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl'
import { GatekeeperIcon } from './GatekeeperIcon'
import { WorkshopInput, WorkshopInputArea } from './WorkshopControls'
import type { BlueprintBindingAnnotation, GadgetClient, GatekeeperCreationSpec } from '@gadgets/workshop-shared/api'

export type BindingCardData = {
  bindingName: string
  resourceTitle: string
  vendorId?: string
  creationSpec: GatekeeperCreationSpec
  annotation: BlueprintBindingAnnotation
}

export function suggestValueLabel(
  spec: GatekeeperCreationSpec,
  title: string | undefined,
  formatMessage: IntlShape['formatMessage'],
): string {
  const displayTitle = title?.trim()
  if (displayTitle) {
    return formatMessage(
      { id: 'blueprintBindingCard.suggestWithTitle', defaultMessage: 'Suggest "{title}" by default' },
      { title: displayTitle },
    )
  }
  switch (spec.type) {
    case 'gatekeeper':
      return formatMessage({ id: 'blueprintBindingCard.suggestResourceDefault', defaultMessage: 'Suggest this resource by default' })
    case 'aiModel':
      return formatMessage({ id: 'blueprintBindingCard.suggestModelDefault', defaultMessage: 'Suggest this model by default' })
    case 'agentSpawner':
      return formatMessage({ id: 'blueprintBindingCard.suggestAgentDefault', defaultMessage: 'Suggest this agent setup by default' })
    case 'ambient':
      // Ambient resources are auto-provided and excluded from blueprints, so this never renders.
      return formatMessage({ id: 'blueprintBindingCard.suggestDefault', defaultMessage: 'Suggest this by default' })
  }
}

export function BlueprintBindingCard({
  data,
  onChange,
  autoFocusDescription,
  flat = false,
}: {
  data: BindingCardData
  onChange: (annotation: BlueprintBindingAnnotation) => void
  autoFocusDescription?: boolean
  /** When true, render without the outer card chrome (border, background, divider). */
  flat?: boolean
}) {
  const { formatMessage } = useIntl()
  const { bindingName, resourceTitle, vendorId, creationSpec, annotation } = data
  const titleId = `blueprint-binding-title-${bindingName}`
  const descriptionId = `blueprint-binding-desc-${bindingName}`
  const displayTitle = annotation.title || resourceTitle || bindingName

  const containerClass = flat
    ? 'space-y-3'
    : 'rounded-xl border border-kumo-line bg-kumo-base'
  const headerClass = flat
    ? 'flex items-start gap-3'
    : 'flex items-start gap-3 px-3 pt-3'
  const descriptionWrapperClass = flat ? '' : 'px-3 pt-2'
  const footerClass = flat
    ? 'flex items-center [&_label]:!text-[12px] [&_label]:!leading-4 [&_label]:!tracking-[-0.2px] [&_label]:!font-normal [&_label]:!text-kumo-subtle'
    : 'mt-2 flex items-center border-t border-kumo-line/70 px-3 py-2 [&_label]:!text-[12px] [&_label]:!leading-4 [&_label]:!tracking-[-0.2px] [&_label]:!font-normal [&_label]:!text-kumo-subtle'

  return (
    <div className={containerClass}>
      <div className={headerClass}>
        <GatekeeperIcon vendorId={vendorId} fallbackText={resourceTitle || bindingName} />
        <div className="min-w-0 flex-1">
          <label htmlFor={titleId} className="sr-only">
            <FormattedMessage id="blueprintBindingCard.connectionNameLabel" defaultMessage="Connection name" />
          </label>
          <WorkshopInput
            id={titleId}
            aria-label={formatMessage(
              { id: 'blueprintBindingCard.nameForBinding', defaultMessage: 'Name for {bindingName}' },
              { bindingName },
            )}
            value={annotation.title}
            onChange={(e) => onChange({ ...annotation, title: e.target.value })}
            placeholder={formatMessage({ id: 'blueprintBindingCard.connectionNameLabel', defaultMessage: 'Connection name' })}
            className="!h-8 w-full bg-kumo-base text-[13px] leading-5 font-medium tracking-[-0.25px]"
          />
          <p className="mt-1 text-[11px] leading-4 tracking-[-0.1px] text-kumo-inactive">
            <FormattedMessage
              id="blueprintBindingCard.referencedInCodeAs"
              defaultMessage="Referenced in code as: {bindingName}"
              values={{ bindingName: <span className="font-mono text-kumo-subtle">{bindingName}</span> }}
            />
          </p>
        </div>
      </div>

      <div className={descriptionWrapperClass}>
        <WorkshopInputArea
          id={descriptionId}
          aria-label={formatMessage(
            { id: 'blueprintBindingCard.helpTextFor', defaultMessage: 'Help text for {displayTitle}' },
            { displayTitle },
          )}
          value={annotation.description}
          onChange={(e) => onChange({ ...annotation, description: e.target.value })}
          placeholder={formatMessage({ id: 'blueprintBindingCard.helpTextPlaceholder', defaultMessage: 'What should people connect here?' })}
          rows={2}
          autoFocus={autoFocusDescription}
          className="w-full resize-none"
        />
      </div>

      <div className={footerClass}>
        <Checkbox
          label={suggestValueLabel(creationSpec, resourceTitle, formatMessage)}
          checked={annotation.suggestValue ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...annotation, suggestValue: checked === true })
          }
        />
      </div>
    </div>
  )
}

export function defaultAnnotation(): BlueprintBindingAnnotation {
  return { title: '', description: '', suggestValue: false }
}

export async function loadBindingCardData(
  gadget: RpcStub<GadgetClient>,
  meta: { name: string; resourceTitle: string; vendorId?: string },
): Promise<BindingCardData | null> {
  const gk = await gadget.getBinding(meta.name)
  try {
    if (!gk) return null
    const creationSpecP = gk.getCreationSpec()
    const annotationP = gadget.getBlueprintAnnotation(meta.name)
    const [creationSpec, existing] = await Promise.all([creationSpecP, annotationP])
    return {
      bindingName: meta.name,
      resourceTitle: meta.resourceTitle,
      vendorId: meta.vendorId,
      creationSpec,
      annotation: existing ?? { ...defaultAnnotation(), title: meta.resourceTitle || meta.name },
    }
  } finally {
    gk?.[Symbol.dispose]()
  }
}
