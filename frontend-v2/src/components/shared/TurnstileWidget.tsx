import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type TurnstileStatus = 'loading' | 'pending' | 'verified' | 'expired' | 'error'
export type TurnstileWidgetHandle = { reset: () => void }

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loader: Promise<TurnstileApi> | null = null
const SCRIPT_SELECTOR = 'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'

export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loader) return loader
  loader = new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.tppTurnstile = 'true'
      document.head.appendChild(script)
    }
    let settled = false
    const finish = () => {
      if (!settled && window.turnstile) {
        settled = true
        cleanup()
        resolve(window.turnstile)
      }
    }
    const fail = () => {
      if (!settled) {
        settled = true
        cleanup()
        script?.remove()
        loader = null
        reject(new Error('Turnstile failed to load'))
      }
    }
    const cleanup = () => {
      script?.removeEventListener('load', finish)
      script?.removeEventListener('error', fail)
      window.clearTimeout(timeout)
    }
    const timeout = window.setTimeout(fail, 10_000)
    script.addEventListener('load', finish)
    script.addEventListener('error', fail)
    finish()
  })
  return loader
}

export function setTurnstileToken(form: FormData, token: string) {
  form.set('challenge_token', token)
}

type Props = {
  siteKey: string
  onToken: (token: string | null) => void
  onStatus: (status: TurnstileStatus) => void
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(function TurnstileWidget(
  { siteKey, onToken, onStatus },
  ref
) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string>()
  const api = useRef<TurnstileApi>()
  const [attempt, setAttempt] = useState(0)
  const [loadFailed, setLoadFailed] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        onToken(null)
        onStatus('pending')
        if (api.current && widgetId.current) {
          api.current.reset(widgetId.current)
        }
      }
    }),
    [onStatus, onToken]
  )

  useEffect(() => {
    let active = true
    onToken(null)
    onStatus('loading')
    setLoadFailed(false)

    void loadTurnstile()
      .then(turnstile => {
        if (!active || !container.current) return
        api.current = turnstile
        onStatus('pending')
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (active) {
              onToken(token)
              onStatus('verified')
            }
          },
          'expired-callback': () => {
            if (active) {
              onToken(null)
              onStatus('expired')
            }
          },
          'timeout-callback': () => {
            if (active) {
              onToken(null)
              onStatus('expired')
            }
          },
          'error-callback': () => {
            if (active) {
              onToken(null)
              onStatus('error')
            }
          }
        })
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true)
          onToken(null)
          onStatus('error')
        }
      })

    return () => {
      active = false
      if (api.current && widgetId.current) {
        api.current.remove(widgetId.current)
      }
      widgetId.current = undefined
    }
  }, [attempt, onStatus, onToken, siteKey])

  return (
    <div className="sm:col-span-2">
      <div ref={container} />
      {loadFailed && (
        <button
          type="button"
          className="mt-2 text-label-sm text-primary font-bold underline cursor-pointer"
          onClick={() => setAttempt(value => value + 1)}
        >
          Retry verification
        </button>
      )}
    </div>
  )
})
