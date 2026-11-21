import { Fragment } from 'react'
import { Select, type PortalContainer } from '@cloudflare/kumo'
import type { AiChatAuthorInfo } from '@gadgets/workshop-shared/api'
import { ConnectionConfigField } from './ConnectionConfigField'
import { useIntl } from 'react-intl'

export interface AiModelConnectionConfigProps {
  chatModels: AiChatAuthorInfo[]
  decisionModels: AiChatAuthorInfo[]
  selectedModelId: string | undefined
  onSelectedModelIdChange: (id: string | undefined) => void
  selectContainer?: PortalContainer
}

export function AiModelConnectionConfig({
  chatModels,
  decisionModels,
  selectedModelId,
  onSelectedModelIdChange,
  selectContainer,
}: AiModelConnectionConfigProps) {
  const { formatMessage } = useIntl()
  const groups = [
    { label: formatMessage({ id: 'aiModelConnectionConfig.languageModels', defaultMessage: 'Language models' }), models: chatModels },
    { label: formatMessage({ id: 'aiModelConnectionConfig.decisionModels', defaultMessage: 'Decision models' }), models: decisionModels },
  ].filter(group => group.models.length > 0)

  return (
    <section className="grid gap-3">
      <ConnectionConfigField
        label={formatMessage({ id: 'aiModelConnectionConfig.modelLabel', defaultMessage: 'Model' })}
        description={formatMessage({ id: 'aiModelConnectionConfig.modelKindsDescription', defaultMessage: 'Language models write text. Decision models answer questions with probabilities.' })}
      >
        <Select
          aria-label={formatMessage({ id: 'aiModelConnectionConfig.selectAiModel', defaultMessage: 'Select an AI model' })}
          className="w-full text-sm [&_button]:!h-9"
          container={selectContainer}
          placeholder={formatMessage({ id: 'aiModelConnectionConfig.selectAiModel', defaultMessage: 'Select an AI model' })}
          value={selectedModelId}
          onValueChange={(v) => onSelectedModelIdChange(v as string | undefined)}
          renderValue={(id) => [...chatModels, ...decisionModels].find((m) => m.id === id)?.name ?? id}
        >
          {groups.map((group, index) => (
            <Fragment key={group.label}>
              {index > 0 && <Select.Separator />}
              <Select.Group>
                <Select.GroupLabel>{group.label}</Select.GroupLabel>
                {group.models.map(model => (
                  <Select.Option key={model.id} value={model.id}>
                    {model.name}
                  </Select.Option>
                ))}
              </Select.Group>
            </Fragment>
          ))}
        </Select>
      </ConnectionConfigField>
    </section>
  )
}
