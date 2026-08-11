import type { ReactNode } from 'react'
import { IntlProvider, ReactIntlErrorCode } from 'react-intl'

// Tests render components in English (the `defaultMessage` on every FormattedMessage/
// formatMessage call) rather than pulling in ja.json, so existing assertions that match
// literal English strings keep working unmodified. `messages={{}}` means every id falls
// back to its defaultMessage; the missing-translation error is expected in that setup, so
// it's silenced here instead of spamming every test run.
export function TestIntlProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider
      locale="en"
      messages={{}}
      onError={(error) => {
        if (error.code === ReactIntlErrorCode.MISSING_TRANSLATION) return
        console.error(error)
      }}
    >
      {children}
    </IntlProvider>
  )
}
