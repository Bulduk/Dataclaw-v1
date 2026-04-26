import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AgentConfig {
  id: string
  name: string
  role: string
  enabled: boolean
  confidenceThreshold: number
}

interface AppState {
  mode: 'paper' | 'live' | 'shadow'
  activeExchange: 'binance' | 'mexc' | 'auto'
  agents: AgentConfig[]
  killSwitchEngaged: boolean
  
  setMode: (mode: 'paper' | 'live' | 'shadow') => void
  setActiveExchange: (exchange: 'binance' | 'mexc' | 'auto') => void
  setKillSwitch: (state: boolean) => void
  updateAgent: (id: string, updates: Partial<AgentConfig>) => void
  addAgent: (agent: AgentConfig) => void
}

export const usePersistentStore = create<AppState>()(
  persist(
    (set) => ({
      mode: 'paper',
      activeExchange: 'auto',
      agents: [
        { id: 'openclaw', name: 'OpenClaw', role: 'executor', enabled: true, confidenceThreshold: 80 },
        { id: 'mirofish', name: 'Mirofish', role: 'signal', enabled: true, confidenceThreshold: 85 },
        { id: 'betafish', name: 'Betafish', role: 'arbitrage', enabled: true, confidenceThreshold: 75 },
        { id: 'onyx', name: 'Onyx', role: 'research', enabled: true, confidenceThreshold: 80 },
      ],
      killSwitchEngaged: false,
      
      setMode: (mode) => set({ mode }),
      setActiveExchange: (exchange) => set({ activeExchange: exchange }),
      setKillSwitch: (state) => set({ killSwitchEngaged: state }),
      
      updateAgent: (id, updates) => set((state) => ({
        agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      
      addAgent: (agent) => set((state) => ({
        agents: [...state.agents, agent]
      })),
    }),
    {
      name: 'dataclaw-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), 
    }
  )
)
