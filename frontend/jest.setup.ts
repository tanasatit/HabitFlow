import '@testing-library/jest-dom'

// Reset fetch mock before each test so tests are isolated
beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})
