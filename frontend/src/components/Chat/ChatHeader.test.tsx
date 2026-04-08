import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatHeader from './ChatHeader';

const conversation = {
    type: 'direct',
    name: 'John',
    initials: 'J',
    status: 'online',
};

describe('ChatHeader', () => {
    it('renders name and status', () => {
        render(
            <ChatHeader
                activeConversation={conversation}
                onShowToast={vi.fn()}
                onStartCall={vi.fn()}
            />,
        );

        expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('triggers call', () => {
        const onStartCall = vi.fn();

        render(
            <ChatHeader
                activeConversation={conversation}
                onShowToast={vi.fn()}
                onStartCall={onStartCall}
            />,
        );

        fireEvent.click(screen.getByTitle('Voice call'));
        expect(onStartCall).toHaveBeenCalled();
    });
});