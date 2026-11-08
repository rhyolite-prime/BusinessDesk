/** Print the already-generated PDF, not the ERP screen or the current canvas page. */
export function printReportPdf(bytes: Uint8Array, onError: () => void): () => void {
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }))
  const frame = document.createElement('iframe')
  frame.title = 'Report print document'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;'
  let printTimer: ReturnType<typeof setTimeout> | undefined
  let cleanupTimer: ReturnType<typeof setTimeout> | undefined
  let closed = false
  const cleanup = () => {
    if (closed) return
    closed = true; clearTimeout(printTimer); clearTimeout(cleanupTimer)
    window.removeEventListener('afterprint', cleanup)
    frame.remove(); URL.revokeObjectURL(url)
  }
  frame.onload = () => {
    // Give the browser's native PDF handler time to finish loading its document.
    printTimer = setTimeout(() => {
      if (closed) return
      try {
        if (!frame.contentWindow) throw new Error('Print window unavailable')
        frame.contentWindow.addEventListener('afterprint', cleanup, { once: true })
        frame.contentWindow.focus(); frame.contentWindow.print()
      } catch { cleanup(); onError() }
    }, 500)
  }
  frame.onerror = () => { cleanup(); onError() }
  window.addEventListener('afterprint', cleanup, { once: true })
  frame.src = url
  document.body.appendChild(frame)
  // Some native PDF handlers do not dispatch afterprint. Retain the document
  // long enough for a print dialog, but always release its object URL eventually.
  cleanupTimer = setTimeout(cleanup, 300000)
  return cleanup
}
