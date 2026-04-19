// FlipFlag SDK Unit Tests
// Run with: node src/sdk.test.js

import flipflag from "./index.js"

// Reset singleton state between tests
function reset() {
  flipflag._flags = {}
  flipflag._config = null
  flipflag._userContext = null
  flipflag._ready = false
}

// Mock global fetch with a fake flags response
function mockFetch(flags, ok = true, status = 200) {
  global.fetch = async () => ({
    ok,
    status,
    json: async () => ({ flags }),
  })
}

let passed = 0, failed = 0

function assert(name, condition, actual) {
  if (condition) {
    console.log(`  ✅ PASS — ${name}`)
    passed++
  } else {
    console.log(`  ❌ FAIL — ${name}`)
    console.log(`     Got: ${JSON.stringify(actual)}`)
    failed++
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testInitRequiresSdkKey() {
  console.log("\n📦 Test: init() throws when sdkKey is missing")
  reset()
  let threw = false
  try { await flipflag.init({}) } catch { threw = true }
  assert("throws without sdkKey", threw)
}

async function testInitSuccessful() {
  console.log("\n📦 Test: init() with valid sdkKey → ready, flags loaded")
  reset()
  mockFetch({ "new-feature": true, "beta-ui": false })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("isReady() is true", flipflag.isReady() === true, flipflag.isReady())
  assert("flags populated", flipflag._flags["new-feature"] === true, flipflag._flags)
}

async function testDefaultBaseURL() {
  console.log("\n📦 Test: init() defaults baseURL to localhost:3001")
  reset()
  mockFetch({})
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("baseURL is localhost:3001", flipflag._config.baseURL === "http://localhost:3001", flipflag._config.baseURL)
}

async function testCustomBaseURLStripsTrailingSlash() {
  console.log("\n📦 Test: init() strips trailing slash from custom baseURL")
  reset()
  mockFetch({})
  await flipflag.init({ sdkKey: "ff_dev_test", baseURL: "https://api.flipflag.io/" })
  assert("trailing slash stripped", flipflag._config.baseURL === "https://api.flipflag.io", flipflag._config.baseURL)
}

async function testDefaultTimeout() {
  console.log("\n📦 Test: init() sets default timeout of 5000ms")
  reset()
  mockFetch({})
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("timeout defaults to 5000", flipflag._config.timeout === 5000, flipflag._config.timeout)
}

async function testCustomTimeout() {
  console.log("\n📦 Test: init() accepts custom timeout")
  reset()
  mockFetch({})
  await flipflag.init({ sdkKey: "ff_dev_test", timeout: 2000 })
  assert("custom timeout is set", flipflag._config.timeout === 2000, flipflag._config.timeout)
}

async function testFetchSendsCorrectHeaders() {
  console.log("\n📦 Test: _fetch() sends correct X-SDK-Key and Content-Type headers")
  reset()
  let capturedHeaders = null
  global.fetch = async (url, opts) => {
    capturedHeaders = opts.headers
    return { ok: true, status: 200, json: async () => ({ flags: {} }) }
  }
  await flipflag.init({ sdkKey: "ff_dev_abc" })
  assert("X-SDK-Key header is set", capturedHeaders["X-SDK-Key"] === "ff_dev_abc", capturedHeaders)
  assert("Content-Type is application/json", capturedHeaders["Content-Type"] === "application/json", capturedHeaders)
}

async function testFetchCallsCorrectEndpoint() {
  console.log("\n📦 Test: _fetch() calls the correct URL")
  reset()
  let capturedURL = null
  global.fetch = async (url, opts) => {
    capturedURL = url
    return { ok: true, status: 200, json: async () => ({ flags: {} }) }
  }
  await flipflag.init({ sdkKey: "ff_dev_test", baseURL: "https://api.example.com" })
  assert("correct endpoint URL", capturedURL === "https://api.example.com/api/sdk/flags", capturedURL)
}

async function testFetchSendsUserContext() {
  console.log("\n📦 Test: _fetch() sends userContext in POST body")
  reset()
  let capturedBody = null
  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body)
    return { ok: true, status: 200, json: async () => ({ flags: {} }) }
  }
  await flipflag.init({ sdkKey: "ff_dev_test", userContext: { userId: "user-1", attributes: { plan: "premium" } } })
  assert("userId in body", capturedBody.userContext.userId === "user-1", capturedBody)
  assert("attributes in body", capturedBody.userContext.attributes?.plan === "premium", capturedBody)
}

async function testFetchSendsEmptyContextWhenNoUserContext() {
  console.log("\n📦 Test: _fetch() sends empty {} when no userContext provided")
  reset()
  let capturedBody = null
  global.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body)
    return { ok: true, status: 200, json: async () => ({ flags: {} }) }
  }
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("userContext is empty object", JSON.stringify(capturedBody.userContext) === "{}", capturedBody)
}

async function testServerErrorCallsOnError() {
  console.log("\n📦 Test: non-ok server response calls onError, ready stays false")
  reset()
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) })
  let caughtError = null
  await flipflag.init({ sdkKey: "ff_dev_test", onError: (err) => { caughtError = err } })
  assert("isReady() is false", flipflag.isReady() === false, flipflag.isReady())
  assert("onError was called", caughtError !== null, caughtError)
  assert("error message includes status code", caughtError?.message?.includes("401"), caughtError?.message)
}

async function testNetworkErrorCallsOnError() {
  console.log("\n📦 Test: network failure calls onError, ready stays false")
  reset()
  global.fetch = async () => { throw new Error("Network failed") }
  let caughtError = null
  await flipflag.init({ sdkKey: "ff_dev_test", onError: (err) => { caughtError = err } })
  assert("isReady() is false", flipflag.isReady() === false, flipflag.isReady())
  assert("onError called with network error", caughtError?.message === "Network failed", caughtError?.message)
}

async function testNetworkErrorNoOnError() {
  console.log("\n📦 Test: network error without onError does NOT throw to caller")
  reset()
  global.fetch = async () => { throw new Error("Network failed") }
  let threw = false
  try { await flipflag.init({ sdkKey: "ff_dev_test" }) } catch { threw = true }
  assert("error does not propagate to caller", threw === false, threw)
}

async function testIsEnabledBeforeInit() {
  console.log("\n📦 Test: isEnabled() before init returns fallback")
  reset()
  assert("returns false by default", flipflag.isEnabled("any-flag") === false, flipflag.isEnabled("any-flag"))
  assert("returns custom fallback=true", flipflag.isEnabled("any-flag", true) === true, flipflag.isEnabled("any-flag", true))
}

async function testIsEnabledReturnsCorrectValues() {
  console.log("\n📦 Test: isEnabled() returns correct true/false per flag")
  reset()
  mockFetch({ "feature-a": true, "feature-b": false })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("enabled flag returns true", flipflag.isEnabled("feature-a") === true, flipflag.isEnabled("feature-a"))
  assert("disabled flag returns false", flipflag.isEnabled("feature-b") === false, flipflag.isEnabled("feature-b"))
}

async function testIsEnabledFallbackForMissingKey() {
  console.log("\n📦 Test: isEnabled() returns fallback for unknown flag key")
  reset()
  mockFetch({ "known-flag": true })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("unknown key → false by default", flipflag.isEnabled("ghost-flag") === false, flipflag.isEnabled("ghost-flag"))
  assert("unknown key → custom fallback", flipflag.isEnabled("ghost-flag", true) === true, flipflag.isEnabled("ghost-flag", true))
}

async function testAllFlagsReturnsCopy() {
  console.log("\n📦 Test: allFlags() returns a shallow copy, not the internal reference")
  reset()
  mockFetch({ "flag-x": true })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  const copy = flipflag.allFlags()
  copy["flag-x"] = false  // mutate the copy
  assert("internal _flags unaffected", flipflag._flags["flag-x"] === true, flipflag._flags["flag-x"])
  assert("allFlags includes the flag", "flag-x" in flipflag.allFlags(), flipflag.allFlags())
}

async function testIsReady() {
  console.log("\n📦 Test: isReady() reflects current fetch state")
  reset()
  assert("false before init", flipflag.isReady() === false)
  mockFetch({ "f": true })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("true after successful init", flipflag.isReady() === true)
  global.fetch = async () => { throw new Error("down") }
  await flipflag.refresh()
  assert("false after failed refresh", flipflag.isReady() === false)
}

async function testIdentifyUpdatesContextAndRefetches() {
  console.log("\n📦 Test: identify() updates userContext and re-fetches")
  reset()
  mockFetch({ "beta-feature": false })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("initially false", flipflag.isEnabled("beta-feature") === false)

  mockFetch({ "beta-feature": true })
  await flipflag.identify({ userId: "premium-user", attributes: { plan: "premium" } })
  assert("userContext updated", flipflag._userContext.userId === "premium-user", flipflag._userContext)
  assert("flags re-fetched after identify", flipflag.isEnabled("beta-feature") === true, flipflag.isEnabled("beta-feature"))
}

async function testRefreshReloadsFlags() {
  console.log("\n📦 Test: refresh() re-fetches and updates flags")
  reset()
  mockFetch({ "rollout-flag": false })
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("flag initially false", flipflag.isEnabled("rollout-flag") === false)

  mockFetch({ "rollout-flag": true })
  await flipflag.refresh()
  assert("flag updated after refresh", flipflag.isEnabled("rollout-flag") === true, flipflag.isEnabled("rollout-flag"))
}

async function testEmptyFlagsResponse() {
  console.log("\n📦 Test: response with no flags → ready=true, allFlags is empty")
  reset()
  mockFetch({})
  await flipflag.init({ sdkKey: "ff_dev_test" })
  assert("isReady() is true", flipflag.isReady() === true)
  assert("allFlags() is empty", Object.keys(flipflag.allFlags()).length === 0, flipflag.allFlags())
}

// ─── Run All ──────────────────────────────────────────────────────────────────

async function runAll() {
  console.log("🚀 FlipFlag SDK Unit Tests")
  console.log("============================")

  await testInitRequiresSdkKey()
  await testInitSuccessful()
  await testDefaultBaseURL()
  await testCustomBaseURLStripsTrailingSlash()
  await testDefaultTimeout()
  await testCustomTimeout()
  await testFetchSendsCorrectHeaders()
  await testFetchCallsCorrectEndpoint()
  await testFetchSendsUserContext()
  await testFetchSendsEmptyContextWhenNoUserContext()
  await testServerErrorCallsOnError()
  await testNetworkErrorCallsOnError()
  await testNetworkErrorNoOnError()
  await testIsEnabledBeforeInit()
  await testIsEnabledReturnsCorrectValues()
  await testIsEnabledFallbackForMissingKey()
  await testAllFlagsReturnsCopy()
  await testIsReady()
  await testIdentifyUpdatesContextAndRefetches()
  await testRefreshReloadsFlags()
  await testEmptyFlagsResponse()

  console.log("\n============================")
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed === 0) console.log("🎉 All tests passed!")
  else console.log(`⚠️  ${failed} test(s) failed`)
}

runAll().catch(console.error)
