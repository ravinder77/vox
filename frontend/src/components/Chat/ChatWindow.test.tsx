import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatWindow from './ChatWindow';
import { createMockConversation, createMockMessage, createMockUser } from '../../test/factory';

describe('ChatWindow', () => {
  it('renders the chat layout and wires child interactions', () => {
    const startCall = vi.fn();
    const endCall = vi.fn();
    const startReply = vi.fn();
    const closeReply = vi.fn();
    const sendMessage = vi.fn();
    const setComposerValue = vi.fn();
    const showToast = vi.fn();
    const addEmoji = vi.fn();
    const toggleEmoji = vi.fn();

    render(
      <ChatWindow
        activeConversation={createMockConversation({ media: ['/1.png'] })}
        activeMessages={[
          createMockMessage({ id: 'm1', text: 'Hello there' }),
        ]}
        callSeconds={84}
        closeReply={closeReply}
        composerValue="Draft"
        currentUser={createMockUser()}
        endCall={endCall}
        isCallActive
        isEmojiOpen={false}
        isTyping={false}
        replyContext={createMockMessage({ id: 'reply-1', text: 'Earlier message' })}
        sendMessage={sendMessage}
        setComposerValue={setComposerValue}
        showToast={showToast}
        startCall={startCall}
        startReply={startReply}
        addEmoji={addEmoji}
        toggleEmoji={toggleEmoji}
      />,
    );

    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText(/1:24/)).toBeInTheDocument();
    expect(screen.getByText('Earlier message')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Voice call'));
    fireEvent.click(screen.getByRole('button', { name: /end call/i }));
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    fireEvent.change(screen.getByPlaceholderText(/message room/i), {
      target: { value: 'Updated draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    fireEvent.click(screen.getByTitle(/close reply/i));
    fireEvent.click(screen.getByTitle(/emoji/i));

    expect(startCall).toHaveBeenCalled();
    expect(endCall).toHaveBeenCalled();
    expect(startReply).toHaveBeenCalled();
    expect(setComposerValue).toHaveBeenCalledWith('Updated draft');
    expect(sendMessage).toHaveBeenCalled();
    expect(closeReply).toHaveBeenCalled();
    expect(toggleEmoji).toHaveBeenCalled();
  });
});
