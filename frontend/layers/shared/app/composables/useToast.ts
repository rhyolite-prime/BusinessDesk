/** Lightweight toast notifications (success / error / info). */

export interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  title: string
  message?: string
}

export function useToast() {
  const toasts = useState<Toast[]>('tl-toasts', () => [])
  let seq = 0

  function push(tone: Toast['tone'], title: string, message?: string, ttl = 4200) {
    const id = ++seq
    toasts.value.push({ id, tone, title, message })
    if (import.meta.client) setTimeout(() => dismiss(id), ttl)
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    success: (title: string, message?: string) => push('success', title, message),
    error: (title: string, message?: string) => push('error', title, message, 7000),
    info: (title: string, message?: string) => push('info', title, message),
    dismiss,
  }
}
