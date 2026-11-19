// Safari (iOS y macOS) cancela la descarga si la URL del blob se libera en el mismo ciclo del clic.
const REVOKE_DELAY_MS = 30_000

/** Descarga un blob con un enlace temporal que no queda en la página. */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
