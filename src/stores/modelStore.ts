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
}

interface ModelState {
  models: AIModel[]
  addModel: (model: Omit<AIModel, 'id'>) => void
  updateModel: (id: string, model: Partial<AIModel>) => void
  deleteModel: (id: string) => void
  setDefaultModel: (id: string) => void
  getDefaultModel: () => AIModel | undefined
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      
      addModel: (model) => set((state) => {
        const id = Date.now().toString()
        const isFirstModel = state.models.length === 0
        return {
          models: [...state.models, { ...model, id, isDefault: isFirstModel || model.isDefault }]
        }
      }),
      
      updateModel: (id, updates) => set((state) => ({
        models: state.models.map((m) => 
          m.id === id ? { ...m, ...updates } : m
        )
      })),
      
      deleteModel: (id) => set((state) => {
        const modelToDelete = state.models.find(m => m.id === id)
        const remainingModels = state.models.filter((m) => m.id !== id)
        
        // If deleting the default model, set the first remaining model as default
        if (modelToDelete?.isDefault && remainingModels.length > 0) {
          remainingModels[0].isDefault = true
        }
        
        return { models: remainingModels }
      }),
      
      setDefaultModel: (id) => set((state) => ({
        models: state.models.map((m) => ({
          ...m,
          isDefault: m.id === id
        }))
      })),
      
      getDefaultModel: () => {
        const state = get()
        return state.models.find((m) => m.isDefault)
      }
    }),
    {
      name: 'ebook-models',
      partialize: (state) => ({
        models: state.models
      })
    }
  )
)
