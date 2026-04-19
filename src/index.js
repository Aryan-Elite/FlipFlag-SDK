const flipflag = {
  _flags: {},
  _config: null,
  _userContext: null,
  _ready: false,

  async init(config = {}) {
    if (!config.sdkKey) throw new Error("FlipFlag: sdkKey is required")

    this._config = {
      sdkKey:  config.sdkKey,
      baseURL: config.baseURL?.replace(/\/$/, "") || "http://localhost:3001",
      timeout: config.timeout ?? 5000,
      onError: config.onError ?? null,
    }

    if (config.userContext) {
      this._userContext = config.userContext
    }

    await this._fetch()
  },

  async _fetch() {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this._config.timeout)

    try {
      const res = await fetch(`${this._config.baseURL}/api/sdk/flags`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "X-SDK-Key": this._config.sdkKey },
        body:    JSON.stringify({ userContext: this._userContext ?? {} }),
        signal:  controller.signal,
      })

      if (!res.ok) throw new Error(`FlipFlag: server responded with ${res.status}`)

      const data = await res.json()
      this._flags = data.flags ?? {}
      this._ready = true
    } catch (err) {
      this._ready = false
      if (this._config?.onError) this._config.onError(err)
    } finally {
      clearTimeout(timer)
    }
  },

  isEnabled(key, fallback = false) {
    if (!this._ready) return fallback
    return key in this._flags ? this._flags[key] : fallback
  },

  allFlags() {
    return { ...this._flags }
  },

  isReady() {
    return this._ready
  },

  async identify(userContext) {
    this._userContext = userContext
    await this._fetch()
  },

  async refresh() {
    await this._fetch()
  },
}

export default flipflag
