import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UrlForm from '@/components/UrlForm';

describe('UrlForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders the URL input and buttons', () => {
    render(<UrlForm onSubmit={mockOnSubmit} isLoading={false} />);

    expect(screen.getByPlaceholderText(/paste youtube url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fetch/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /paste/i })).toBeInTheDocument();
  });

  it('calls onSubmit with the URL when form is submitted', async () => {
    render(<UrlForm onSubmit={mockOnSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText(/paste youtube url/i);
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=test123' } });

    const submitButton = screen.getByRole('button', { name: /fetch/i });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('https://www.youtube.com/watch?v=test123');
  });

  it('disables the submit button when loading', () => {
    render(<UrlForm onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /fetching/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables the submit button when input is empty', () => {
    render(<UrlForm onSubmit={mockOnSubmit} isLoading={false} />);

    const submitButton = screen.getByRole('button', { name: /fetch/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows examples section', () => {
    render(<UrlForm onSubmit={mockOnSubmit} isLoading={false} />);

    expect(screen.getByText(/examples/i)).toBeInTheDocument();
    expect(screen.getByText(/youtube\.com\/watch/i)).toBeInTheDocument();
  });
});
