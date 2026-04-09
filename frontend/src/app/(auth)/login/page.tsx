'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/lib/hooks/useToast'
import { Input } from '@/components/ui/Input'
import { GoogleSignInButton } from '@/components/features/auth/GoogleSignInButton'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Sign-in failed: invalid security token. Please try again.',
  google_auth_failed: 'Google sign-in failed. Please try again.',
  server_error: 'An error occurred. Please try again.',
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] ?? 'An error occurred. Please try again.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const err = await login({ email, password })
    setLoading(false)

    if (err) {
      setError(err)
      showToast('Invalid email or password.', 'error')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface border border-outline rounded-2xl p-10 w-full max-w-md shadow-sm">
        <div className="mb-6">
          <h1 className="font-headline italic font-black text-3xl text-primary mb-1">HabitFlow AI</h1>
          <p className="text-on-surface-variant text-sm">Welcome back</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl py-3 text-sm transition-all cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-outline" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 bg-surface text-on-surface-variant tracking-wider">or</span>
          </div>
        </div>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-on-surface-variant text-sm">
          No account?{' '}
          <a href="/register" className="text-primary font-bold hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  )
}
