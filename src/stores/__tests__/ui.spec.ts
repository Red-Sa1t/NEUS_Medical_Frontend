import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useUiStore } from '../ui'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks concurrent loading without going below zero', () => {
    const store = useUiStore()

    store.startLoading()
    store.startLoading()
    expect(store.isLoading).toBe(true)
    expect(store.loadingCount).toBe(2)

    store.stopLoading()
    store.stopLoading()
    store.stopLoading()
    expect(store.isLoading).toBe(false)
    expect(store.loadingCount).toBe(0)
  })

  it('stores and clears global messages', () => {
    const store = useUiStore()

    store.notify({ type: 'success', text: '保存成功' })
    expect(store.message).toEqual({ type: 'success', text: '保存成功' })

    store.clearMessage()
    expect(store.message).toBeNull()
  })
})
