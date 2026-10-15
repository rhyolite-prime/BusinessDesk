/** Lightweight toast notifications shared by every feature layer. */

export interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  title: string
  message?: string
}

export function useToast() {
  const toasts = useState<Toast[]>('businessdesk-toasts', () => [])
  const nextId = useState('businessdesk-toast-sequence', () => 0)

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(tone: Toast['tone'], title: string, message?: string, ttl = 4200) {
    const id = ++nextId.value
    toasts.value.push({ id, tone, title, message })
    if (import.meta.client) window.setTimeout(() => dismiss(id), ttl)
  }

  return {
    toasts,
    success: (title: string, message?: string) => push('success', title, message),
    error: (title: string, message?: string) => push('error', title, message, 7000),
    info: (title: string, message?: string) => push('info', title, message),
    dismiss,
  }
}
