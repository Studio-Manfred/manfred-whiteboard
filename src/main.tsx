import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// DS styles must come before the app's index.css so app rules can override
// where they clash. The DS ships one compiled bundle at `./styles` (also
// includes the token CSS custom properties). See knowledge/ERRORS.md
// 2026-09-29 (STU-982) for why this is easy to miss.
import '@studio-manfred/manfred-design-system/styles'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
