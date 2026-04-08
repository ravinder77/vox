import { render, screen, fireEvent } from '@testing-library/react';
import ReplyBanner from './ReplyBanner';
import { describe, it, expect, vi } from 'vitest';

describe('ReplyBanner', () => {
    it('renders reply content', () => {
        render(
            <ReplyBanner
                replyContext={{ author: 'Alex', text: 'Hello' }}
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByText(/replying to alex/i)).toBeInTheDocument();
    });

    it('calls onClose', () => {
        const onClose = vi.fn();

        render(
            <ReplyBanner
                replyContext={{ author: 'Alex', text: 'Hello' }}
                onClose={onClose}
            />,
        );

        fireEvent.click(screen.getByText('✕'));
        expect(onClose).toHaveBeenCalled();
    });
});