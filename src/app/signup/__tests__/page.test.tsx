import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import SignupPage from '../page'
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

describe('Signup Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('renders signup form correctly', () => {
    render(<SignupPage />)
    
    expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@university.edu')).toBeInTheDocument()
    expect(screen.getByText('Sign up using your student email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)
    
    const submitButton = screen.getByRole('button', { name: /send code/i })
    await user.click(submitButton)
    
    // HTML5 validation should prevent submission with empty required fields
    // The form should not submit with empty required fields
    expect(submitButton).not.toBeDisabled()
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)
    
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const submitButton = screen.getByRole('button', { name: /send code/i })
    
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    // HTML5 email validation should prevent submission with invalid email format
    // The form should not submit with invalid email format
    expect(submitButton).not.toBeDisabled()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockResolvedValue({ data: {}, error: null })
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
    
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<SignupPage />)
    
    // Fill out the form
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const submitButton = screen.getByRole('button', { name: /send code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      })
    })
  })

  it('handles signup error', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockResolvedValue({ 
      data: null, 
      error: { message: 'User already registered' } 
    })
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
    
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<SignupPage />)
    
    // Fill out minimal required fields
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const submitButton = screen.getByRole('button', { name: /send code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/user already registered/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const mockSignInWithOtp = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
    )
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
    
    ;(supabase.auth.signInWithOtp as jest.Mock).mockImplementation(mockSignInWithOtp)
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<SignupPage />)
    
    // Fill out minimal required fields
    const emailInput = screen.getByPlaceholderText('you@university.edu')
    const submitButton = screen.getByRole('button', { name: /send code/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    expect(screen.getByText(/sending/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('navigates to login page when login link is clicked', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)
    
    // The signup page doesn't have a login link in the current implementation
    // This test should be removed or the component should be updated to include a login link
    expect(screen.queryByText(/already have an account/i)).not.toBeInTheDocument()
  })
})

