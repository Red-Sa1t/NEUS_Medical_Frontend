import { defineStore } from 'pinia'

export type UiMessageType = 'success' | 'error' | 'warning' | 'info'

export interface UiMessage {
  type: UiMessageType
  text: string
}

export interface UiState {
  loadingCount: number
  message: UiMessage | null
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    loadingCount: 0,
    message: null
  }),
  getters: {
    isLoading: (state): boolean => state.loadingCount > 0
  },
  actions: {
    startLoading(): void {
      this.loadingCount += 1
    },
    stopLoading(): void {
      this.loadingCount = Math.max(0, this.loadingCount - 1)
    },
    notify(message: UiMessage): void {
      this.message = message
    },
    clearMessage(): void {
      this.message = null
    }
  }
})
