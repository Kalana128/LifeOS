import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Loader2, AlertCircle, LayoutDashboard } from 'lucide-react'

interface AuthProps {
  isDark: boolean
}

export default function Auth({ isDark }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cardBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  const inputBg = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        })
        if (error) throw error
        setSuccess('Account created! Please check your email to confirm (or just log in if auto-confirm is on).')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl border shadow-xl ${cardBg}`}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <LayoutDashboard size={32} className="text-blue-500" />
            <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Life<span className="text-blue-500">OS</span>
            </h1>
          </div>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isSignUp ? 'Create your secure account' : 'Sign in to your dashboard'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
              />
            </div>
          )}
          
          <div>
            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
            />
          </div>

          <div>
            <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 transition ${inputBg}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium transition bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
              className="ml-1 text-blue-500 hover:text-blue-400 font-medium transition"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
        
        {!isSignUp && (
          <div className={`mt-8 p-3 rounded-lg text-xs text-center ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <p className="font-semibold mb-1">Demo Access</p>
            <p>Email: demo@lifeos.com</p>
            <p>Password: demo123456</p>
          </div>
        )}
      </div>
    </div>
  )
}