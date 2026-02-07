import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CustomPrompt {
  id: string
  name: string
  content: string
  description?: string
  createdAt: number
  updatedAt: number
}

interface CustomPromptStore {
  prompts: CustomPrompt[]
  addPrompt: (
    prompt: Omit<CustomPrompt, 'id' | 'createdAt' | 'updatedAt'>
  ) => void
  updatePrompt: (id: string, prompt: Partial<CustomPrompt>) => void
  deletePrompt: (id: string) => void
  getPrompt: (id: string) => CustomPrompt | undefined
}

export const useCustomPromptStore = create<CustomPromptStore>()(
  persist(
    (set, get) => ({
      prompts: [],

      addPrompt: (prompt) => {
        const newPrompt: CustomPrompt = {
          ...prompt,
          id: Date.now().toString(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        set((state) => ({
          prompts: [...state.prompts, newPrompt],
        }))
      },

      updatePrompt: (id, prompt) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...prompt, updatedAt: Date.now() } : p
          ),
        }))
      },

      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        }))
      },

      getPrompt: (id) => {
        return get().prompts.find((p) => p.id === id)
      },
    }),
    {
      name: 'custom-prompts-storage',
    }
  )
)
