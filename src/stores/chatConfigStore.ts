import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatConfigState {
  openRouterKey: string
  embeddingModel: string
  setOpenRouterKey: (key: string) => void
  setEmbeddingModel: (model: string) => void
}

export const useChatConfigStore = create<ChatConfigState>()(
  persist(
    (set) => ({
      openRouterKey: '',
      // default embedding model
      embeddingModel: 'nomic-embed-text',
      setOpenRouterKey: (key) => set({ openRouterKey: key }),
      setEmbeddingModel: (model) => set({ embeddingModel: model }),
    }),
    {
      name: 'ebook-mindmap-chat-config',
    }
  )
)
