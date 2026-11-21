import { createIntl, createIntlCache, ReactIntlErrorCode, type IntlShape } from 'react-intl'
import jaMessages from './messages/ja.json'

// Tests render the English defaultMessages, as TestIntlProvider does for components.
const inTest = import.meta.env.MODE === 'test'

const intl = createIntl(
  {
    locale: inTest ? 'en' : 'ja',
    messages: inTest ? {} : jaMessages,
    onError: (error) => {
      if (error.code === ReactIntlErrorCode.MISSING_TRANSLATION) return
      console.error(error)
    },
  },
  createIntlCache(),
)

/**
 * Formats a message outside React: module-level constants and helpers that have no
 * `useIntl()`. The UI runs in a single fixed locale (see main.tsx), so evaluating these once at
 * module load gives the same text the components show.
 */
export const t: IntlShape['formatMessage'] = intl.formatMessage
