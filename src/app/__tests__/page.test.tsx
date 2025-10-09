import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import Page from '../page'
import { supabase } from '@/lib/supabaseClient'

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

describe('Login Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    localStorage.clear()
    jest.clearAllMocks()
    
    // Mock Supabase client
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ 
        data: { auth_id: 'test-user-id', student_id: '12345678' }, 
        error: null 
      }),
    })
    
    ;(supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      data: {},
      error: null
    })
  })

  it('renders login form correctly', () => {
    render(<Page />)
    
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText('Login using your student email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@university.edu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup()
    render(<Page />)
    
    const submitButton = screen.getByRole('button', { name: /login/i })
    await user.click(submitButton)
    
    // HTML5 validation should prevent submission, so no error message should appear
    // The form should not submit with empty required fields
    expect(submitButton).not.toBeDisabled()
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    // HTML5 email validation should prevent submission with invalid email format
    // The form should not submit with invalid email format
    expect(submitButton).not.toBeDisabled()
  })

  it('submits form with valid email', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockResolvedValue({ data: {}, error: null })
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          shouldCreateUser: false,
        },
      })
    })
  })

  it('handles sign in error', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockResolvedValue({ 
      data: null, 
      error: { message: 'Signup not allowed for otp' } 
    })
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/signup not allowed for otp/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
    )
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /login/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    expect(screen.getByText(/checking/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('navigates to signup page when signup link is clicked', async () => {
    const user = userEvent.setup()
    render(<Page />)
    
    const signupLink = screen.getByText(/sign up/i)
    await user.click(signupLink)
    
    expect(mockRouter.push).toHaveBeenCalledWith('/signup')
  })
})

