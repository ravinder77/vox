import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MessageBubble from './MessageBubble';
import {
    createMockConversation,
    createMockMessage,
    createMockUser,
} from '../../test/factory';

describe('MessageBubble', () => {
    const defaultHandlers = {
        onReply: vi.fn(),
        onShowToast: vi.fn(),
    };

    it('renders own text message', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({ text: 'Hello world' })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('renders other user message with fallback name', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    sender: 'other',
                    senderUserId: '2',
                    senderName: '',
                })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('Room')).toBeInTheDocument();
    });

    it('renders reply preview', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage()}
                replyPreview="Original message"
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    it('renders image message', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    kind: 'image',
                    image: 'test.png',
                })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByAltText('Shared media')).toBeInTheDocument();
    });

    it('renders file message and handles download', () => {
        const onShowToast = vi.fn();

        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    kind: 'file',
                    fileName: 'doc.pdf',
                    fileSize: '2MB',
                })}
                replyPreview=""
                onReply={vi.fn()}
                onShowToast={onShowToast}
            />,
        );

        expect(screen.getByText('doc.pdf')).toBeInTheDocument();

        fireEvent.click(screen.getByText('⬇'));
        expect(onShowToast).toHaveBeenCalledWith('Downloading file…');
    });

    it('renders status only for own messages', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    status: '✓✓',
                })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('✓✓')).toBeInTheDocument();
    });

    it('does not render status for other users', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    sender: 'other',
                    senderUserId: '2',
                    status: '✓✓',
                })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.queryByText('✓✓')).not.toBeInTheDocument();
    });

    it('renders reactions', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    reactions: [{ emoji: '🔥', count: 3 }],
                })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('uses senderUserId for ownership', () => {
        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser({ id: '1' })}
                message={createMockMessage({
                    senderUserId: '1',
                })}
                replyPreview=""
                {...defaultHandlers}
            />,
        );

        expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('falls back to preview text when empty', () => {
        const onShowToast = vi.fn();

        render(
            <MessageBubble
                activeConversation={createMockConversation()}
                currentUser={createMockUser()}
                message={createMockMessage({
                    text: '',
                    caption: '',
                    fileName: '',
                })}
                replyPreview=""
                onReply={vi.fn()}
                onShowToast={onShowToast}
            />,
        );

        fireEvent.click(screen.getByText('😊'));
        expect(onShowToast).toHaveBeenCalledWith('React to: Alex: shared a message');
    });
});
