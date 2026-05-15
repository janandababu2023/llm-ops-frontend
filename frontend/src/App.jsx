import { useState, useEffect, useRef } from 'react'
import {
  Brain, FileText, Upload, Send, CheckCircle2, AlertCircle,
  Loader2, Sparkles, Database, Trash2, X
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { uploadPdf, askQuestion, viewData, healthCheck } from './api'

export default function App() {
  // ───────── State ─────────
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null) // { type, message, chunks }
  const [chunksLoaded, setChunksLoaded] = useState(0)

  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [asking, setAsking] = useState(false)

  const [backendOnline, setBackendOnline] = useState(null)
  const scrollRef = useRef(null)

  // ───────── Effects ─────────
  useEffect(() => {
    healthCheck()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
    refreshChunkCount()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, asking])

  async function refreshChunkCount() {
    try {
      const data = await viewData()
      setChunksLoaded(data.total_chunks || 0)
    } catch {
      /* ignore */
    }
  }

  // ───────── Handlers ─────────
  async function handleUpload(e) {
    e?.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadStatus(null)
    try {
      const data = await uploadPdf(file)
      setUploadStatus({
        type: 'success',
        message: `${file.name} indexed successfully`,
        chunks: data.total_chunks,
      })
      await refreshChunkCount()
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  async function handleAsk(e) {
    e?.preventDefault()
    const q = question.trim()
    if (!q || asking) return

    setMessages((m) => [...m, { role: 'user', content: q }])
    setQuestion('')
    setAsking(true)

    try {
      const data = await askQuestion(q)
      setMessages((m) => [...m, { role: 'assistant', content: data.answer }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${err.message}`, error: true }])
    } finally {
      setAsking(false)
    }
  }

  function handleClearChat() {
    setMessages([])
  }

  // ───────── UI ─────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50">
      {/* HEADER */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">DocuMind</h1>
              <p className="text-xs text-slate-500 leading-tight">AI Document Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusPill online={backendOnline} />
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600">
              <Database className="w-4 h-4" />
              <span>{chunksLoaded} chunks indexed</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Upload */}
        <section className="lg:col-span-1 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-semibold">Upload Document</h2>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Upload a PDF — we'll index it so you can ask questions about it.
            </p>

            <FileDropzone file={file} onFileChange={setFile} />

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary w-full mt-4"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Indexing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Index PDF
                </>
              )}
            </button>

            {uploadStatus && (
              <div
                className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                  uploadStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {uploadStatus.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <div>
                  <div className="font-medium">{uploadStatus.message}</div>
                  {uploadStatus.chunks && (
                    <div className="text-xs mt-0.5 opacity-80">
                      {uploadStatus.chunks} chunks created
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2"><span className="text-brand-600">•</span>Ask specific questions for better answers</li>
              <li className="flex gap-2"><span className="text-brand-600">•</span>Answers use only your document — no outside knowledge</li>
              <li className="flex gap-2"><span className="text-brand-600">•</span>If something isn't in the doc, the assistant will say so</li>
            </ul>
          </div>
        </section>

        {/* RIGHT — Chat */}
        <section className="lg:col-span-2">
          <div className="card flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-semibold">Ask a Question</h2>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 scroll-area">
              {messages.length === 0 && !asking && <EmptyState />}
              <div className="space-y-4">
                {messages.map((m, i) => <Message key={i} message={m} />)}
                {asking && <TypingIndicator />}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleAsk} className="p-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={chunksLoaded === 0 ? 'Upload a PDF first to ask questions…' : 'Ask anything about your document…'}
                  className="input"
                  disabled={asking || chunksLoaded === 0}
                />
                <button type="submit" disabled={!question.trim() || asking || chunksLoaded === 0} className="btn-primary">
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-slate-400">
        Powered by FastAPI · ChromaDB · OpenAI · React
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

function StatusPill({ online }) {
  if (online === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse-slow" />
        Connecting…
      </span>
    )
  }
  return online ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      Backend online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
      <span className="w-2 h-2 rounded-full bg-red-500" />
      Backend offline
    </span>
  )
}

function FileDropzone({ file, onFileChange }) {
  const [dragOver, setDragOver] = useState(false)

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped && dropped.type === 'application/pdf') onFileChange(dropped)
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
        dragOver
          ? 'border-brand-500 bg-brand-50'
          : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
      }`}
    >
      {file ? (
        <div className="flex items-center gap-3 w-full">
          <FileText className="w-8 h-8 text-brand-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onFileChange(null) }}
            className="p-1 hover:bg-slate-200 rounded"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <div className="text-sm font-medium text-slate-700">Drop your PDF here</div>
          <div className="text-xs text-slate-500 mt-1">or click to browse</div>
        </>
      )}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
    </label>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-brand-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">Ready to assist</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md">
        Upload a PDF and start asking questions. I'll answer using only your document — no guesses, no hallucinations.
      </p>
    </div>
  )
}

function Message({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : message.error
              ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
        <Brain className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
          <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
          <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
        </div>
      </div>
    </div>
  )
}
