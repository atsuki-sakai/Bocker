type SentryEnvironment = {
  override?: string
  vercelEnvironment?: string
}

export const shouldEnableSentry = ({ override, vercelEnvironment }: SentryEnvironment): boolean =>
  override === 'true' || (override !== 'false' && vercelEnvironment === 'production')
