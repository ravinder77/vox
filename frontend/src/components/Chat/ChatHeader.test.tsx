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

    it('shows participant count and secondary actions for groups', () => {
        const onShowToast = vi.fn();

        render(
            <ChatHeader
                activeConversation={{
                    ...conversation,
                    type: 'group',
                    participantCount: 3,
                }}
                onShowToast={onShowToast}
                onStartCall={vi.fn()}
            />,
        );

        expect(screen.getByText('3 participants')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Video call'));
        fireEvent.click(screen.getByTitle('Search'));
        fireEvent.click(screen.getByTitle('Pin'));
        fireEvent.click(screen.getByTitle('More'));

        expect(onShowToast).toHaveBeenCalledWith('Starting video call…');
        expect(onShowToast).toHaveBeenCalledWith('Search in conversation');
        expect(onShowToast).toHaveBeenCalledWith('Pinned messages');
        expect(onShowToast).toHaveBeenCalledWith('More options');
    });
});
