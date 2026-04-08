import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageBubble from './MessageBubble';

const baseConversation = {
    id: 'c1',
    name: 'Room',
    initials: 'R',
    type: 'direct',
};

const currentUser = {
    id: '1',
    name: 'Alex',
    initials: 'A',
};

const defaultHandlers = {
    onReply: vi.fn(),
    onShowToast: vi.fn(),
};

describe('MessageBubble', () => {
    it('renders own text message', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm1',
                    kind: 'text',
                    text: 'Hello world',
                    sender: 'self',
                    time: '10:00',
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByText('You')).toBeInTheDocument(); // role
    });

    it('renders other user message with fallback name', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm2',
                    kind: 'text',
                    text: 'Hi',
                    sender: 'other',
                    time: '10:01',
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('Room')).toBeInTheDocument(); // fallback author
    });

    it('renders reply preview when present', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm3',
                    kind: 'text',
                    text: 'Replying',
                    sender: 'self',
                    time: '10:02',
                }}
                replyPreview="Original message"
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    it('renders image message', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm4',
                    kind: 'image',
                    image: 'test.png',
                    time: '10:03',
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByAltText('Shared media')).toBeInTheDocument();
    });

    it('renders file message and handles download click', () => {
        const onShowToast = vi.fn();

        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm5',
                    kind: 'file',
                    fileName: 'doc.pdf',
                    fileSize: '2MB',
                    time: '10:04',
                }}
                replyPreview=""
                onReply={vi.fn()}
                onShowToast={onShowToast}
            />,
        );

        expect(screen.getByText('doc.pdf')).toBeInTheDocument();

        fireEvent.click(screen.getByText('⬇'));
        expect(onShowToast).toHaveBeenCalledWith('Downloading file…');
    });

    it('renders message status only for own messages', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm6',
                    kind: 'text',
                    text: 'Delivered',
                    sender: 'self',
                    status: '✓✓',
                    time: '10:05',
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('✓✓')).toBeInTheDocument();
    });

    it('does not render status for others', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm7',
                    kind: 'text',
                    text: 'Other msg',
                    sender: 'other',
                    status: '✓✓',
                    time: '10:06',
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.queryByText('✓✓')).not.toBeInTheDocument();
    });

    it('renders reactions when present', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm8',
                    kind: 'text',
                    text: 'Reacted',
                    sender: 'self',
                    time: '10:07',
                    reactions: [{ emoji: '🔥', count: 3 }],
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('uses senderUserId logic for ownership', () => {
        render(
            <MessageBubble
                activeConversation={baseConversation}
                currentUser={currentUser}
                message={{
                    id: 'm9',
                    kind: 'text',
                    text: 'Ownership check',
                    senderUserId: '1',
                    time: '10:08',
                }}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('You')).toBeInTheDocument();
    });
});