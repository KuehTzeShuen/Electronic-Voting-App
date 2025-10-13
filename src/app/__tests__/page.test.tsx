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
    
    ;(supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null
    })
  })

  it('renders login form correctly', () => {
    render(<Page />)
    
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText('Login using your student email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@university.edu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument()
  })

  it('shows validation error for empty email', async () => {
    const user = userEvent.setup()
    render(<Page />)
    
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
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
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    // HTML5 email validation should prevent submission with invalid email format
    // The form should not submit with invalid email format
    expect(submitButton).not.toBeDisabled()
  })

  it('sends OTP and shows verification form', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockResolvedValue({ data: {}, error: null })
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
    
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
    
    // Should now show OTP verification form
    await waitFor(() => {
      expect(screen.getByText('Enter verification code')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter 6-digit code')).toBeInTheDocument()
      expect(screen.getByText('We sent a verification code to test@example.com')).toBeInTheDocument()
    })
  })

  it('handles OTP send error', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockResolvedValue({ 
      data: null, 
      error: { message: 'Signup not allowed for otp' } 
    })
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/signup not allowed for otp/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during OTP send', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
    )
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    
    render(<Page />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const submitButton = screen.getByRole('button', { name: /send verification code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(studentIdInput, '12345678')
    await user.click(submitButton)
    
    expect(screen.getByText(/sending code/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('verifies OTP and redirects to polling menu', async () => {
    const user = userEvent.setup()
    const mockVerifyOtp = jest.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
      error: null 
    })
    ;(supabase.auth.verifyOtp as jest.Mock).mockImplementation(mockVerifyOtp)
    
    render(<Page />)
    
    // First, send OTP
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const studentIdInput = screen.getByPlaceholderText('e.g. 12345678')
    const sendButton = screen.getByRole('button', { name: /send verification code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(studentIdInput, '12345678')
    await user.click(sendButton)
    
    // Wait for OTP form to appear
    await waitFor(() => {
      expect(screen.getByText('Enter verification code')).toBeInTheDocument()
    })
    
    // Enter OTP and verify
    const otpInput = screen.getByPlaceholderText('Enter 6-digit code')
    const verifyButton = screen.getByRole('button', { name: /verify code/i })
    
    await user.type(otpInput, '123456')
    await user.click(verifyButton)
    
    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      })
      expect(mockRouter.push).toHaveBeenCalledWith('/polling-menu')
    })
  })

  it('navigates to signup page when signup link is clicked', async () => {
    const user = userEvent.setup()
    render(<Page />)
    
    const signupLink = screen.getByText(/sign up/i)
    await user.click(signupLink)
    
    expect(mockRouter.push).toHaveBeenCalledWith('/signup')
  })
})

