import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import OngoingPollsPage from '../page'

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

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

describe('Polling Menu Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    jest.clearAllMocks()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    
    // Mock localStorage for role
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'appRole') return 'student'
      if (key === 'appEmail') return 'test@example.com'
      return null
    })
  })

  it('renders page header correctly', () => {
    render(<OngoingPollsPage />)
    
    expect(screen.getByText('Polls')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<OngoingPollsPage />)
    
    // Check for skeleton loading elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders background elements', () => {
    render(<OngoingPollsPage />)
    
    // Check for background gradient elements
    expect(document.querySelector('.bg-gradient-to-br')).toBeInTheDocument()
    expect(document.querySelector('.bg-gradient-to-tr')).toBeInTheDocument()
  })

  it('renders main content structure', () => {
    render(<OngoingPollsPage />)
    
    // Check for main structural elements
    expect(document.querySelector('header')).toBeInTheDocument()
    expect(document.querySelector('main')).toBeInTheDocument()
  })
})