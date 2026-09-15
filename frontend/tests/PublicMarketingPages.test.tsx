import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Landing from '../src/pages/Landing';
import HowItWorks from '../src/pages/HowItWorks';

describe('public marketing pages', () => {
  it('points the landing hero actions to registration and How It Works', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /^get started(?: free)?$/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /see how it works/i })).toHaveAttribute('href', '/how-it-works');
  });

  it('explains the real student journey and provides registration actions', () => {
    render(<MemoryRouter><HowItWorks /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /from joining to getting study help/i })).toBeInTheDocument();
    expect(screen.getByText('Find and share academic resources')).toBeInTheDocument();
    expect(screen.getByText('Turn resources into study support')).toBeInTheDocument();
    expect(screen.getByText('Ask, discuss and solve together')).toBeInTheDocument();
    expect(screen.getByText('Find support and opportunities')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your free account/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });

  it('shows the expanded set of current student features on the landing page', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);

    expect(screen.getByText('AI study support')).toBeInTheDocument();
    expect(screen.getByText('Freelance opportunities')).toBeInTheDocument();
    expect(screen.getByText('Save & stay updated')).toBeInTheDocument();
  });
});
