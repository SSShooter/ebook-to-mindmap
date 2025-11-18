import { Route, Switch } from 'wouter'
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from './components/layout/Sidebar'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ModelsPage } from './pages/ModelsPage'
import { CustomPromptsPage } from './pages/CustomPromptsPage'

function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Toaster />
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Switch>
          <Route path="/" component={SummaryPage} />
          <Route path="/models" component={ModelsPage} />
          <Route path="/custom-prompts" component={CustomPromptsPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </div>
    </div>
  )
}

export default App
