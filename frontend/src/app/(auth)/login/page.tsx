'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 rounded-2xl bg-gray-900 shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400 mb-8">Sign in to HabitFlow AI</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
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

          <Button type="submit" loading={loading}>
            Sign In
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 bg-gray-900 text-gray-500 tracking-wider">or</span>
          </div>
        </div>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-gray-400 text-sm">
          No account?{' '}
          <a href="/register" className="text-[#FF6B6B] hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  )
}
