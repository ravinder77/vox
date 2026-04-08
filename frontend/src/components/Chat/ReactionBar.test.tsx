import { render, screen } from '@testing-library/react';
import ReactionBar from './ReactionBar';
import { describe, it, expect } from 'vitest';

describe('ReactionBar', () => {
    it('does not render when empty', () => {
        const { container } = render(<ReactionBar reactions={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders reactions', () => {
        render(<ReactionBar reactions={[{ emoji: '👍', count: 2 }]} />);
        expect(screen.getByText('👍')).toBeInTheDocument();
    });
});