import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import './index.css'
import App from './App.jsx'
import DiscordProvider from './components/core/DiscordProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DiscordProvider>
      <App />
    </DiscordProvider>
  </StrictMode>,
)
