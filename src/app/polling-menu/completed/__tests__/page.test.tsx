import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import CompletedPollsPage from '../page'
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

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

const mockCompletedCampaigns = [
  {
    id: '1',
    title: 'Completed Poll 1',
    description: 'Test description 1',
    vote_type: 'single' as const,
    starts_at: '2024-01-01T00:00:00Z',
    ends_at: '2024-01-15T23:59:59Z', // Past date
    is_published: true,
    club: 'Test Club',
  },
  {
    id: '2',
    title: 'Completed Poll 2',
    description: 'Test description 2',
    vote_type: 'preferential' as const,
    starts_at: '2024-01-01T00:00:00Z',
    ends_at: '2024-01-20T23:59:59Z', // Past date
    is_published: true,
    club: null,
  },
]

describe('Completed Polls Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    jest.clearAllMocks()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
    
    // Clear localStorage mock
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
    
    // Mock localStorage for role
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'appRole') return 'student'
      if (key === 'appEmail') return 'test@example.com'
      return null
    })
  })

  it('renders page correctly for student role', async () => {
    const mockFrom = jest.fn().mockImplementation((table) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
        }
      }
      // Default mock for other tables (like users)
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            first_name: 'John', 
            last_name: 'Doe',
            student_id: '12345',
            gender: 'male',
            ug_pg: 'undergraduate',
            dob: '2000-01-01',
            discipline: '1',
            location: '1',
            grade: 'A'
          }, 
          error: null 
        }),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Completed Polls')).toBeInTheDocument()
      expect(screen.getByText('Completed Poll 1')).toBeInTheDocument()
      expect(screen.getByText('Completed Poll 2')).toBeInTheDocument()
    })
  })

  it('renders page correctly for admin role', async () => {
    // Override localStorage mock for admin role
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'appRole') return 'admin'
      if (key === 'appEmail') return 'admin@example.com'
      return null
    })
    
    const mockFrom = jest.fn().mockImplementation((table) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
        }
      }
      // Default mock for other tables (like users)
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            first_name: 'Admin', 
            last_name: 'User',
            student_id: 'admin123',
            gender: 'male',
            ug_pg: 'graduate',
            dob: '1995-01-01',
            discipline: '2',
            location: '2',
            grade: 'A+'
          }, 
          error: null 
        }),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Completed Polls')).toBeInTheDocument()
      expect(screen.getAllByText('View Results')).toHaveLength(2)
      expect(screen.getAllByText('View Summary')).toHaveLength(2)
    })
  })

  it('shows back to ongoing button', async () => {
    const mockFrom = jest.fn().mockImplementation((table) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
        }
      }
      // Default mock for other tables (like users)
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            first_name: 'John', 
            last_name: 'Doe',
            student_id: '12345',
            gender: 'male',
            ug_pg: 'undergraduate',
            dob: '2000-01-01',
            discipline: '1',
            location: '1',
            grade: 'A'
          }, 
          error: null 
        }),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Back to Ongoing')).toBeInTheDocument()
    })
  })

  it('handles back to ongoing button click', async () => {
    const mockFrom = jest.fn().mockImplementation((table) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
        }
      }
      // Default mock for other tables (like users)
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            first_name: 'John', 
            last_name: 'Doe',
            student_id: '12345',
            gender: 'male',
            ug_pg: 'undergraduate',
            dob: '2000-01-01',
            discipline: '1',
            location: '1',
            grade: 'A'
          }, 
          error: null 
        }),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      const backButton = screen.getByText('Back to Ongoing')
      fireEvent.click(backButton)
      expect(mockRouter.push).toHaveBeenCalledWith('/polling-menu')
    })
  })

  it('shows admin buttons for admin role', async () => {
    // Override localStorage mock for admin role
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'appRole') return 'admin'
      if (key === 'appEmail') return 'admin@example.com'
      return null
    })
    
    const mockFrom = jest.fn().mockImplementation((table) => {
      if (table === 'campaigns') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
        }
      }
      // Default mock for other tables (like users)
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            first_name: 'Admin', 
            last_name: 'User',
            student_id: 'admin123',
            gender: 'male',
            ug_pg: 'graduate',
            dob: '1995-01-01',
            discipline: '2',
            location: '2',
            grade: 'A+'
          }, 
          error: null 
        }),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      expect(screen.getAllByText('View Results')).toHaveLength(2)
      expect(screen.getAllByText('View Summary')).toHaveLength(2)
    })
  })

  it('handles view results button click for admin', async () => {
    // Override localStorage mock for admin role
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'appRole') return 'admin'
      if (key === 'appEmail') return 'admin@example.com'
      return null
    })
    
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { 
          first_name: 'Admin', 
          last_name: 'User',
          student_id: 'admin123',
          gender: 'male',
          ug_pg: 'graduate',
          dob: '1995-01-01',
          discipline: '2',
          location: '2',
          grade: 'A+'
        }, 
        error: null 
      }),
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      const viewResultsButtons = screen.getAllByText('View Results')
      fireEvent.click(viewResultsButtons[0])
      expect(mockRouter.push).toHaveBeenCalledWith('/poll/1/results')
    })
  })

  it('handles view summary button click for admin', async () => {
    // Override localStorage mock for admin role
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'appRole') return 'admin'
      if (key === 'appEmail') return 'admin@example.com'
      return null
    })
    
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { 
          first_name: 'Admin', 
          last_name: 'User',
          student_id: 'admin123',
          gender: 'male',
          ug_pg: 'graduate',
          dob: '1995-01-01',
          discipline: '2',
          location: '2',
          grade: 'A+'
        }, 
        error: null 
      }),
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      const viewSummaryButtons = screen.getAllByText('View Summary')
      fireEvent.click(viewSummaryButtons[0])
      expect(mockRouter.push).toHaveBeenCalledWith('/poll/1/summary')
    })
  })

  it('shows no polls message when no completed campaigns exist', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { 
          first_name: 'John', 
          last_name: 'Doe',
          student_id: '12345',
          gender: 'male',
          ug_pg: 'undergraduate',
          dob: '2000-01-01',
          discipline: '1',
          location: '1',
          grade: 'A'
        }, 
        error: null 
      }),
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('No completed polls yet.')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    render(<CompletedPollsPage />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('opens and closes profile modal', async () => {
    const user = userEvent.setup()
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { 
          first_name: 'John', 
          last_name: 'Doe',
          student_id: '12345',
          gender: 'male',
          ug_pg: 'undergraduate',
          dob: '2000-01-01',
          discipline: '1',
          location: '1',
          grade: 'A'
        }, 
        error: null 
      }),
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      const profileButton = screen.getByText('Profile')
      fireEvent.click(profileButton)
    })
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByText('Close')
    await user.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
    })
  })

  it('handles logout', async () => {
    const user = userEvent.setup()
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { 
          first_name: 'John', 
          last_name: 'Doe',
          student_id: '12345',
          gender: 'male',
          ug_pg: 'undergraduate',
          dob: '2000-01-01',
          discipline: '1',
          location: '1',
          grade: 'A'
        }, 
        error: null 
      }),
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      const profileButton = screen.getByText('Profile')
      fireEvent.click(profileButton)
    })
    
    await waitFor(async () => {
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
    })
    
    expect(mockRouter.push).toHaveBeenCalledWith('/')
    expect(localStorage.removeItem).toHaveBeenCalledWith('appEmail')
    expect(localStorage.removeItem).toHaveBeenCalledWith('appRole')
  })

  it('displays completed polls with opacity styling', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockCompletedCampaigns, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ 
        data: { 
          first_name: 'John', 
          last_name: 'Doe',
          student_id: '12345',
          gender: 'male',
          ug_pg: 'undergraduate',
          dob: '2000-01-01',
          discipline: '1',
          location: '1',
          grade: 'A'
        }, 
        error: null 
      }),
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)
    
    render(<CompletedPollsPage />)
    
    await waitFor(() => {
      const pollCards = screen.getAllByText(/Completed Poll \d/)
      pollCards.forEach(card => {
        const parentElement = card.closest('.opacity-75')
        expect(parentElement).toBeInTheDocument()
      })
    })
  })
})

