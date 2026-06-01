import { useEffect, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState(null)

  const show = (msg) => setMessage(msg)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  return { message, show }
}

export function Toast({ message }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${message ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
      <div className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-semibold max-w-sm">
        <div className="bg-emerald-500 text-white p-1 rounded-full shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <span>{message}</span>
      </div>
    </div>
  )
}
