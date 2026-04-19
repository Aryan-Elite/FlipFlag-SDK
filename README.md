# @getflipflag/sdk

The official JavaScript SDK for [FlipFlag](https://github.com/Aryan-Elite/FlipFlag) — evaluate feature flags in your frontend app with one function call.

## What is this?

FlipFlag lets you turn features on/off for your users without redeploying your app. This SDK connects your frontend to the FlipFlag backend and tells you which flags are enabled for a given user.

## Installation

```bash
npm install @getflipflag/sdk
```

## Quick Start

```js
import flipflag from "@getflipflag/sdk"

// 1. Initialize once at app startup (fetches all flags from FlipFlag backend)
await flipflag.init({
  sdkKey: "ff_dev_xxxxxxxx",  // get this from FlipFlag dashboard → Settings → Developer
  baseURL: "https://your-flipflag-backend.com",
})

// 2. Check flags anywhere in your app (instant, no network call)
if (flipflag.isEnabled("new-checkout")) {
  // show new checkout flow
} else {
  // show old checkout flow
}
```

## Usage with User Targeting

Pass a user context to evaluate flags per user — useful for targeting specific users or plans:

```js
await flipflag.init({
  sdkKey: "ff_dev_xxxxxxxx",
  baseURL: "https://your-flipflag-backend.com",
  userContext: {
    userId: "user-123",               // used for percentage rollouts
    attributes: { plan: "premium" },  // used for rule-based targeting
  },
})

flipflag.isEnabled("beta-feature")  // → true or false based on targeting rules
```

## Usage with React

```jsx
import { useState, useEffect } from "react"
import flipflag from "@getflipflag/sdk"

export default function App() {
  const [flags, setFlags] = useState(null)

  useEffect(() => {
    flipflag.init({
      sdkKey: import.meta.env.VITE_FLIPFLAG_SDK_KEY,
      baseURL: import.meta.env.VITE_FLIPFLAG_BASE_URL,
      userContext: { userId: "user-123", attributes: { plan: "pro" } },
    }).then(() => {
      setFlags(flipflag.allFlags())
    })
  }, [])

  if (!flags) return <div>Loading...</div>

  return (
    <div>
      {flags["new-hero"] ? <NewHero /> : <OldHero />}
    </div>
  )
}
```

## API Reference

### `flipflag.init(config)` → `Promise<void>`

Fetches all flags from the FlipFlag backend. Call this once at app startup.

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `sdkKey` | string | ✅ | — | SDK key from FlipFlag dashboard |
| `baseURL` | string | ❌ | `http://localhost:3001` | Your FlipFlag backend URL |
| `userContext` | object | ❌ | `{}` | User info for targeting |
| `timeout` | number | ❌ | `5000` | Request timeout in ms |
| `onError` | function | ❌ | `null` | Called if the fetch fails |

---

### `flipflag.isEnabled(key, fallback?)` → `boolean`

Check if a flag is enabled. Reads from cache — no network call.

```js
flipflag.isEnabled("new-checkout")        // → false (default fallback)
flipflag.isEnabled("new-checkout", true)  // → true (custom fallback if flag missing)
```

---

### `flipflag.allFlags()` → `object`

Returns all flags as a plain object.

```js
flipflag.allFlags()  // → { "new-checkout": true, "beta-ui": false }
```

---

### `flipflag.isReady()` → `boolean`

Returns `true` after a successful `init()`.

```js
if (flipflag.isReady()) {
  // safe to call isEnabled()
}
```

---

### `flipflag.identify(userContext)` → `Promise<void>`

Update the user context and re-fetch flags. Use this after login or a plan upgrade.

```js
// User just logged in
await flipflag.identify({
  userId: "user-456",
  attributes: { plan: "premium" },
})
```

---

### `flipflag.refresh()` → `Promise<void>`

Re-fetch flags from the backend without changing the user context.

```js
await flipflag.refresh()
```

## How It Works

1. `init()` makes a single `POST` request to your FlipFlag backend with the user context
2. The backend evaluates all flags for that user and returns `{ "flag-key": true/false }`
3. The SDK caches the result — every `isEnabled()` call after that reads from cache instantly
4. No continuous polling — call `refresh()` manually if you need updated values

```
Your App
  ↓
flipflag.init()  →  POST /api/sdk/flags  →  FlipFlag Backend
                                                  ↓
                                          evaluate flags for user
                                                  ↓
                ←  { "new-checkout": true }  ←───
  ↓
flipflag.isEnabled("new-checkout")  →  true  (instant, from cache)
```

## Error Handling

Errors never throw to your app — they're caught internally and passed to `onError`:

```js
await flipflag.init({
  sdkKey: "ff_dev_xxx",
  onError: (err) => {
    console.error("FlipFlag failed:", err.message)
    // app continues with fallback values
  },
})
```

If `init()` fails, `isReady()` returns `false` and `isEnabled()` returns the fallback value (default: `false`).

## TypeScript

Types are included out of the box — no `@types` package needed.

```ts
import flipflag from "@getflipflag/sdk"
// fully typed ✅
```

## License

MIT
