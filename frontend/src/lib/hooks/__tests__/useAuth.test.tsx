import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../useAuth'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

// Mock @/lib/auth
jest.mock('@/lib/auth', () => ({
  authApi: {
    me: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}))

import { authApi } from '@/lib/auth'

const mockAuthApi = authApi as jest.Mocked<typeof authApi>

const mockUser = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'free' as const,
  created_at: '2026-01-01T00:00:00Z',
}

// Test component that uses useAuth
function AuthConsumer() {
  const { user, loading } = useAuth()
  if (loading) return <div>loading</div>
  return <div>{user ? `logged-in:${user.email}` : 'logged-out'}</div>
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('shows loading then user when me() succeeds', async () => {
    mockAuthApi.me.mockResolvedValueOnce({ data: mockUser })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('logged-in:test@example.com')).toBeInTheDocument())
  })

  test('shows logged-out when me() returns no data', async () => {
    mockAuthApi.me.mockResolvedValueOnce({ data: undefined })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText('logged-out')).toBeInTheDocument())
  })

  test('login sets user on success', async () => {
    mockAuthApi.me.mockResolvedValueOnce({ data: undefined })
    mockAuthApi.login.mockResolvedValueOnce({ data: mockUser })

    let loginFn: ((input: { email: string; password: string }) => Promise<string | null>) | null = null

    function LoginConsumer() {
      const { user, loading, login } = useAuth()
      loginFn = login
      if (loading) return <div>loading</div>
      return <div>{user ? `user:${user.email}` : 'no-user'}</div>
    }

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByText('no-user')).toBeInTheDocument())

    await act(async () => {
      const err = await loginFn!({ email: 'test@example.com', password: 'pw' })
      expect(err).toBeNull()
    })

    expect(screen.getByText('user:test@example.com')).toBeInTheDocument()
  })

  test('login returns error string on failure', async () => {
    mockAuthApi.me.mockResolvedValueOnce({ data: undefined })
    mockAuthApi.login.mockResolvedValueOnce({ error: 'Invalid credentials' })

    let loginFn: ((input: { email: string; password: string }) => Promise<string | null>) | null = null

    function LoginConsumer() {
      const { login } = useAuth()
      loginFn = login
      return <div>ready</div>
    }

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    )

    await waitFor(() => screen.getByText('ready'))

    let err: string | null = null
    await act(async () => {
      err = await loginFn!({ email: 'bad@example.com', password: 'wrong' })
    })

    expect(err).toBe('Invalid credentials')
  })

  test('register sets user on success', async () => {
    mockAuthApi.me.mockResolvedValueOnce({ data: undefined })
    mockAuthApi.register.mockResolvedValueOnce({ data: mockUser })

    let registerFn: ((input: { email: string; password: string; name: string }) => Promise<string | null>) | null = null

    function RegisterConsumer() {
      const { user, loading, register } = useAuth()
      registerFn = register
      if (loading) return <div>loading</div>
      return <div>{user ? `user:${user.email}` : 'no-user'}</div>
    }

    render(
      <AuthProvider>
        <RegisterConsumer />
      </AuthProvider>
    )

    await waitFor(() => screen.getByText('no-user'))

    await act(async () => {
      const err = await registerFn!({ email: 'new@example.com', password: 'pw', name: 'New' })
      expect(err).toBeNull()
    })

    expect(screen.getByText('user:test@example.com')).toBeInTheDocument()
  })

  test('logout clears user', async () => {
    mockAuthApi.me.mockResolvedValueOnce({ data: mockUser })
    mockAuthApi.logout.mockResolvedValueOnce({ data: undefined })

    let logoutFn: (() => Promise<void>) | null = null

    function LogoutConsumer() {
      const { user, loading, logout } = useAuth()
      logoutFn = logout
      if (loading) return <div>loading</div>
      return <div>{user ? `user:${user.email}` : 'logged-out'}</div>
    }

    render(
      <AuthProvider>
        <LogoutConsumer />
      </AuthProvider>
    )

    await waitFor(() => screen.getByText('user:test@example.com'))

    await act(async () => {
      await logoutFn!()
    })

    expect(screen.getByText('logged-out')).toBeInTheDocument()
  })

  test('throws when useAuth used outside AuthProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    function BadConsumer() {
      useAuth()
      return null
    }

    expect(() => render(<BadConsumer />)).toThrow('useAuth must be used within AuthProvider')
    consoleError.mockRestore()
  })
})
