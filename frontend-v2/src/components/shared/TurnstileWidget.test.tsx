// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  setTurnstileToken,
  TurnstileWidget,
  type TurnstileStatus,
  type TurnstileWidgetHandle,
} from './TurnstileWidget'

afterEach(() => {
  document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove())
  delete window.turnstile
  vi.restoreAllMocks()
})

describe('TurnstileWidget (frontend-v2)', () => {
  it('becomes ready, emits a token, and handles expiration', async () => {
    let options: Record<string, any> = {}
    const onToken = vi.fn()
    const statuses: TurnstileStatus[] = []
    const ref = createRef<TurnstileWidgetHandle>()

    window.turnstile = {
      render: vi.fn((_container, renderOptions) => {
        options = renderOptions
        return 'widget-1'
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    }

    render(
      <TurnstileWidget
        ref={ref}
        siteKey="1x00000000000000000000AA"
        onToken={onToken}
        onStatus={(status) => statuses.push(status)}
      />
    )

    await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalledOnce())
    act(() => options.callback('verified-token'))
    expect(onToken).toHaveBeenLastCalledWith('verified-token')
    expect(statuses).toContain('verified')

    act(() => options['expired-callback']())
    expect(onToken).toHaveBeenLastCalledWith(null)
    expect(statuses).toContain('expired')

    act(() => ref.current?.reset())
    expect(window.turnstile.reset).toHaveBeenCalledWith('widget-1')
    expect(statuses).toContain('pending')
  })

  it('handles widget verification errors', async () => {
    let options: Record<string, any> = {}
    const onToken = vi.fn()
    const onStatus = vi.fn()

    window.turnstile = {
      render: vi.fn((_container, renderOptions) => {
        options = renderOptions
        return 'widget-1'
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    }

    render(<TurnstileWidget siteKey="1x00000000000000000000AA" onToken={onToken} onStatus={onStatus} />)

    await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalledOnce())
    act(() => options['error-callback']())
    expect(onToken).toHaveBeenLastCalledWith(null)
    expect(onStatus).toHaveBeenLastCalledWith('error')
  })

  it('does not overwrite synchronous verification with pending', async () => {
    const onToken = vi.fn()
    const onStatus = vi.fn()

    window.turnstile = {
      render: vi.fn((_container, options: any) => {
        options.callback('instant-token')
        return 'widget-1'
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    }

    render(<TurnstileWidget siteKey="test-site-key" onToken={onToken} onStatus={onStatus} />)

    await waitFor(() => expect(onToken).toHaveBeenLastCalledWith('instant-token'))
    expect(onStatus).toHaveBeenLastCalledWith('verified')
  })

  it('uses challenge_token field name for backend submission payload', () => {
    const form = new FormData()
    setTurnstileToken(form, 'cf-token-abc-123')
    expect(form.get('challenge_token')).toBe('cf-token-abc-123')
    expect(form.get('cf-turnstile-response')).toBeNull()
  })

  it('handles script load failure and renders retry button', async () => {
    const onToken = vi.fn()
    const onStatus = vi.fn()

    // Render with mock script error
    const { getByText } = render(
      <TurnstileWidget siteKey="test-site-key" onToken={onToken} onStatus={onStatus} />
    )

    // Trigger script error event
    const script = document.querySelector('script[src*="turnstile"]')
    expect(script).toBeTruthy()
    act(() => {
      script?.dispatchEvent(new Event('error'))
    })

    await waitFor(() => {
      expect(onStatus).toHaveBeenCalledWith('error')
      expect(getByText('Retry verification')).toBeTruthy()
    })
  })
})
