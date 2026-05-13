import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Toggle from './Toggle';

describe('Toggle', () => {
  it('renders the active state and handles clicks', () => {
    const onClick = vi.fn();

    render(<Toggle checked onClick={onClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('toggle', 'active');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
