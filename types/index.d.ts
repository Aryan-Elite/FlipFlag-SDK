export interface UserContext {
  userId?: string
  attributes?: Record<string, string | number | boolean>
}

export interface FlipFlagConfig {
  sdkKey: string
  baseURL?: string
  timeout?: number
  userContext?: UserContext
  onError?: (error: Error) => void
}

export interface FlipFlagClient {
  init(config: FlipFlagConfig): Promise<void>
  isEnabled(key: string, fallback?: boolean): boolean
  allFlags(): Record<string, boolean>
  isReady(): boolean
  identify(userContext: UserContext): Promise<void>
  refresh(): Promise<void>
}

declare const flipflag: FlipFlagClient
export default flipflag
