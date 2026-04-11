import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  test('typing updates textarea value', async () => {
    render(<ChatInput onSend={jest.fn()} disabled={false} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, 'Hello')
    expect(textarea).toHaveValue('Hello')
  })

  test('Send button is disabled when input is empty', () => {
    render(<ChatInput onSend={jest.fn()} disabled={false} />)
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  test('Send button is enabled when input has non-whitespace text', async () => {
    render(<ChatInput onSend={jest.fn()} disabled={false} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, 'Hello')
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled()
  })

  test('Send button is disabled when disabled prop is true', async () => {
    render(<ChatInput onSend={jest.fn()} disabled={true} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, 'Hello')
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  test('pressing Enter calls onSend with trimmed text and clears input', async () => {
    const onSend = jest.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, 'Hello world')
    await userEvent.keyboard('{Enter}')
    expect(onSend).toHaveBeenCalledWith('Hello world')
    expect(textarea).toHaveValue('')
  })

  test('pressing Shift+Enter inserts newline and does NOT call onSend', async () => {
    const onSend = jest.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, 'Line one')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSend).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('Line one\n')
  })

  test('clicking Send button calls onSend and clears input', async () => {
    const onSend = jest.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, 'Send this')
    await userEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(onSend).toHaveBeenCalledWith('Send this')
    expect(textarea).toHaveValue('')
  })

  test('whitespace-only input does not call onSend on Enter', async () => {
    const onSend = jest.fn()
    render(<ChatInput onSend={onSend} disabled={false} />)
    const textarea = screen.getByPlaceholderText(/describe your week/i)
    await userEvent.type(textarea, '   ')
    await userEvent.keyboard('{Enter}')
    expect(onSend).not.toHaveBeenCalled()
  })
})
