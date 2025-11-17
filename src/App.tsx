import { Route, Switch } from 'wouter'
import { Toaster } from '@/components/ui/sonner'
import { Sidebar } from './components/layout/Sidebar'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster />
      <Sidebar />
      <div className="flex-1 flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        <Switch>
          <Route path="/" component={SummaryPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
        <Footer />
      </div>
    </div>
  )
}

export default App
