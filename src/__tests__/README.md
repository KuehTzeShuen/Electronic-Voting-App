# Testing Guide

This project uses Jest and React Testing Library for unit testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- **Page Tests**: Located in `__tests__` folders within each page directory
- **Component Tests**: Located in `__tests__` folders within each component directory
- **Utilities**: Shared test utilities in `src/__tests__/utils/`

## Test Coverage

The following areas are covered by tests:

### Pages
- ✅ Login page (`src/app/__tests__/page.test.tsx`)
- ✅ Signup page (`src/app/signup/__tests__/page.test.tsx`)
- ✅ Polling menu page (`src/app/polling-menu/__tests__/page.test.tsx`)
- ✅ Completed polls page (`src/app/polling-menu/completed/__tests__/page.test.tsx`)
- ✅ Poll detail/voting page (`src/app/poll/[id]/__tests__/page.test.tsx`)
- ✅ Poll results page (`src/app/poll/[id]/results/__tests__/page.test.tsx`)

### Components
- ✅ Button component (`src/components/__tests__/Button.test.tsx`)

## Test Utilities

### Mock Data Factories
- `createMockCampaign()` - Creates mock campaign data
- `createMockOption()` - Creates mock option data
- `createMockUser()` - Creates mock user data
- `createMockVoteResult()` - Creates mock vote results

### Mock Functions
- `createMockSupabaseResponse()` - Creates mock Supabase responses
- `createMockSupabaseFrom()` - Creates mock Supabase query chains

## Testing Patterns

### 1. Page Component Testing
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PageComponent from '../page'

describe('Page Component', () => {
  beforeEach(() => {
    // Setup mocks and localStorage
  })

  it('renders correctly', async () => {
    render(<PageComponent />)
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument()
    })
  })
})
```

### 2. User Interaction Testing
```typescript
it('handles user input', async () => {
  const user = userEvent.setup()
  render(<Component />)
  
  await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(mockFunction).toHaveBeenCalledWith('test@example.com')
})
```

### 3. Async Operations Testing
```typescript
it('loads data from API', async () => {
  const mockData = createMockCampaign()
  mockSupabaseFrom.mockResolvedValue({ data: mockData, error: null })
  
  render(<Component />)
  
  await waitFor(() => {
    expect(screen.getByText(mockData.title)).toBeInTheDocument()
  })
})
```

## Mocked Dependencies

### Supabase
- Authentication methods (`signInWithOtp`, `signUp`, etc.)
- Database queries (`from().select().eq()`, etc.)
- Real-time subscriptions (`channel().on().subscribe()`)

### Next.js
- Router (`useRouter`, `useParams`, `useSearchParams`)
- Navigation functions (`push`, `replace`, etc.)

### Browser APIs
- `localStorage`
- `window.matchMedia`
- `URL.createObjectURL`

## Coverage Goals

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Data-Testid Sparingly**: Prefer semantic queries (getByRole, getByText)
3. **Mock External Dependencies**: Always mock Supabase, router, and localStorage
4. **Test Error States**: Include tests for API errors and edge cases
5. **Use waitFor**: For async operations and state updates
6. **Clean Up**: Reset mocks and localStorage in beforeEach

## Common Test Scenarios

### Authentication Flow
- Login with valid/invalid credentials
- Signup with validation errors
- Role-based access control

### Voting Flow
- Single vs preferential voting
- Vote submission and validation
- Already voted state handling

### Navigation
- Button clicks and route changes
- Back navigation
- Conditional navigation based on role

### Data Loading
- Loading states
- Error handling
- Empty states
- Real-time updates

