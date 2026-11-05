import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { PwaUpdatePrompt } from './components/pwa-update-prompt'

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </>
  )
}

export default App
