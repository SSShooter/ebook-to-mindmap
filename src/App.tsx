import { Route, Switch } from 'wouter'
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from './components/layout/Sidebar'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ModelsPage } from './pages/ModelsPage'
import { CustomPromptsPage } from './pages/CustomPromptsPage'
import { CacheManagementPage } from './pages/CacheManagementPage'
import { Menu } from 'lucide-react'
import { useState } from 'react'

function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Toaster />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isMobile={true}
      />

      <div className="flex-1 flex flex-col bg-white max-w-full min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/icon.png" alt="icon" className="h-8 w-8 flex-shrink-0" />
            <span className="font-semibold text-base truncate">eBook To Mindmap</span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <Switch>
          <Route path="/" component={SummaryPage} />
          <Route path="/models" component={ModelsPage} />
          <Route path="/custom-prompts" component={CustomPromptsPage} />
          <Route path="/cache" component={CacheManagementPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </div>
    </div>
  )
}

export default App
