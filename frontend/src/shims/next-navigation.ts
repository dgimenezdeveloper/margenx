import { useLocation, useNavigate } from 'react-router-dom'

export const usePathname = () => {
  return useLocation().pathname
}

export const useRouter = () => {
  const navigate = useNavigate()
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    prefetch: () => {},
  }
}