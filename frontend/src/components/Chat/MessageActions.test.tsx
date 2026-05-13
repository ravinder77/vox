import { render, screen, fireEvent } from '@testing-library/react';
import MessageActions from './MessageActions';
import { vi, describe, it, expect } from 'vitest';

const message = { id: '1' };

describe('MessageActions', () => {
    it('calls reply handler', () => {
        const onReply = vi.fn();

        render(
            <MessageActions
                message={message}
                previewText="hello"
                onReply={onReply}
                onShowToast={vi.fn()}
                isOwn={false}
            />,
        );

        fireEvent.click(screen.getByText(/reply/i));
        expect(onReply).toHaveBeenCalledWith(message);
    });

    it('shows copy button only for others', () => {
        render(
            <MessageActions
                message={message}
                previewText="hello"
                onReply={vi.fn()}
                onShowToast={vi.fn()}
                isOwn={false}
            />,
        );

        expect(screen.getByText('📋')).toBeInTheDocument();
    });
});