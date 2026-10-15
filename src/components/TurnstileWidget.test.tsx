// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setTurnstileToken, TurnstileWidget, type TurnstileStatus, type TurnstileWidgetHandle } from './TurnstileWidget'

afterEach(()=>{document.head.querySelectorAll('script[src*="turnstile"]').forEach(node=>node.remove());delete window.turnstile;vi.restoreAllMocks()})

describe('TurnstileWidget',()=>{
  it('becomes ready, emits a token, and handles expiration',async()=>{
    let options:Record<string,any>={}; const onToken=vi.fn(); const statuses:TurnstileStatus[]=[]; const ref=createRef<TurnstileWidgetHandle>()
    window.turnstile={render:vi.fn((_container,renderOptions)=>{options=renderOptions;return 'widget-1'}),reset:vi.fn(),remove:vi.fn()}
    render(<TurnstileWidget ref={ref} siteKey="site-key" onToken={onToken} onStatus={status=>statuses.push(status)}/>)
    await waitFor(()=>expect(window.turnstile?.render).toHaveBeenCalledOnce())
    act(()=>options.callback('verified-token'))
    expect(onToken).toHaveBeenLastCalledWith('verified-token'); expect(statuses).toContain('verified')
    act(()=>options['expired-callback']())
    expect(onToken).toHaveBeenLastCalledWith(null); expect(statuses).toContain('expired')
    act(()=>ref.current?.reset())
    expect(window.turnstile.reset).toHaveBeenCalledWith('widget-1'); expect(statuses).toContain('pending')
  })

  it('handles widget verification errors',async()=>{
    let options:Record<string,any>={}; const onToken=vi.fn(); const onStatus=vi.fn()
    window.turnstile={render:vi.fn((_container,renderOptions)=>{options=renderOptions;return 'widget-1'}),reset:vi.fn(),remove:vi.fn()}
    render(<TurnstileWidget siteKey="site-key" onToken={onToken} onStatus={onStatus}/>)
    await waitFor(()=>expect(window.turnstile?.render).toHaveBeenCalledOnce())
    act(()=>options['error-callback']())
    expect(onToken).toHaveBeenLastCalledWith(null); expect(onStatus).toHaveBeenLastCalledWith('error')
  })

  it('does not overwrite synchronous verification with pending',async()=>{
    const onToken=vi.fn(); const onStatus=vi.fn()
    window.turnstile={render:vi.fn((_container,options:any)=>{options.callback('instant-token');return 'widget-1'}),reset:vi.fn(),remove:vi.fn()}
    render(<TurnstileWidget siteKey="test-site-key" onToken={onToken} onStatus={onStatus}/>)
    await waitFor(()=>expect(onToken).toHaveBeenLastCalledWith('instant-token'))
    expect(onStatus).toHaveBeenLastCalledWith('verified')
  })

  it('uses the backend field name for token submission',()=>{
    const form=new FormData(); setTurnstileToken(form,'token-value')
    expect(form.get('challenge_token')).toBe('token-value')
    expect(form.get('cf-turnstile-response')).toBeNull()
  })
})
