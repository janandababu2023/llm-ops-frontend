// All API calls go through /api/* — Nginx (prod) or Vite proxy (dev)
// forwards them to the FastAPI backend on port 8000.
const API_BASE = '/api'

export async function uploadPdf(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/upload-pdf/`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function askQuestion(question) {
  const url = `${API_BASE}/ask/?question=${encodeURIComponent(question)}`
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function viewData() {
  const res = await fetch(`${API_BASE}/view-data/`)
  if (!res.ok) throw new Error(`Failed to fetch data`)
  return res.json()
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/`)
  if (!res.ok) throw new Error('Backend not reachable')
  return res.json()
}
