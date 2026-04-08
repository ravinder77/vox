import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
  it('renders the visible state when a message exists', () => {
    render(<Toast message="Saved" />);

    const toast = screen.getByText('Saved');
    expect(toast).toHaveClass('toast', 'show');
  });

  it('renders the hidden state when the message is empty', () => {
    render(<Toast message="" />);

    const toast = document.querySelector('.toast');
    expect(toast).toHaveClass('toast');
    expect(toast).not.toHaveClass('show');
  });
});
