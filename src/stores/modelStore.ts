import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIProvider } from '../types/ai'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  apiKey: string
  apiUrl: string
  model: string
  temperature: number
  isDefault: boolean
  useCorsProxy: boolean
  isFixed?: boolean
  costDescription?: string
}

interface ModelState {
  models: AIModel[]
  addModel: (model: Omit<AIModel, 'id'>) => void
  updateModel: (id: string, model: Partial<AIModel>) => void
  deleteModel: (id: string) => void
  setDefaultModel: (id: string) => void
  getDefaultModel: () => AIModel | undefined
}

const DEFAULT_FIXED_MODEL: AIModel = {
  id: 'mind-elixir-star',
  name: 'MindElixirStar',
  provider: 'openai',
  apiKey: 'mind-elixir',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:7001/api/v1',
  model: 'MindElixirStar',
  temperature: 0.7,
  isDefault: false,
  useCorsProxy: false,
  isFixed: true,
  costDescription: 'models.fixedModelCostHint',
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [DEFAULT_FIXED_MODEL],

      addModel: (model) =>
        set((state) => {
          const id = Date.now().toString()
          const isFirstModel = state.models.length === 0
          return {
            models: [
              ...state.models,
              { ...model, id, isDefault: isFirstModel || model.isDefault },
            ],
          }
        }),

      updateModel: (id, updates) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteModel: (id) =>
        set((state) => {
          const modelToDelete = state.models.find((m) => m.id === id)
          if (modelToDelete?.isFixed) return state

          const remainingModels = state.models.filter((m) => m.id !== id)

          // If deleting the default model, set the first remaining model as default
          if (modelToDelete?.isDefault && remainingModels.length > 0) {
            remainingModels[0].isDefault = true
          }

          return { models: remainingModels }
        }),

      setDefaultModel: (id) =>
        set((state) => ({
          models: state.models.map((m) => ({
            ...m,
            isDefault: m.id === id,
          })),
        })),

      getDefaultModel: () => {
        const state = get()
        return state.models.find((m) => m.isDefault)
      },
    }),
    {
      name: 'ebook-models',
      partialize: (state) => ({
        models: state.models,
      }),
      // Rehydrate fixed model if missing (important since it's persisted)
      onRehydrateStorage: () => (state) => {
        if (state) {
          const index = state.models.findIndex(
            (m) => m.id === DEFAULT_FIXED_MODEL.id
          )
          if (index === -1) {
            state.models = [DEFAULT_FIXED_MODEL, ...state.models]
          } else {
            // Force update fixed model properties (e.g. costDescription)
            state.models[index] = {
              ...state.models[index],
              ...DEFAULT_FIXED_MODEL,
            }
          }
        }
      },
    }
  )
)
