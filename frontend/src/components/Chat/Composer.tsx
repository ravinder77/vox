import { useRef } from 'react';
import EmojiPicker from './EmojiPicker';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { Conversation } from '../../types/app';

type ComposerProps = {
  activeConversation?: Conversation;
  composerValue: string;
  isEmojiOpen: boolean;
  onAddEmoji: (emoji: string) => void;
  onChange: (value: string) => void;
  onSend: () => void;
  onShowToast: (message: string) => void;
  onToggleEmoji: () => void;
};

export default function Composer({
  activeConversation,
  composerValue,
  isEmojiOpen,
  onAddEmoji,
  onChange,
  onSend,
  onShowToast,
  onToggleEmoji,
}: ComposerProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const { value } = event.target;
    onChange(value);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="composer-wrap">
      <EmojiPicker isOpen={isEmojiOpen} onAdd={onAddEmoji} />
      <div className="composer">
        <textarea
          ref={textAreaRef}
          className="composer-input"
          rows={1}
          placeholder={`Message ${activeConversation?.name ?? 'conversation'}…`}
          value={composerValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div className="composer-actions">
          <button type="button" className="composer-btn" title="Emoji" onClick={onToggleEmoji}>
            😊
          </button>
          <button type="button" className="composer-btn" title="Attach file" onClick={() => onShowToast('File picker opened')}>
            📎
          </button>
          <button type="button" className="composer-btn" title="Image" onClick={() => onShowToast('Image picker opened')}>
            🖼️
          </button>
          <button type="button" className="composer-btn" title="GIF" onClick={() => onShowToast('GIF picker opened')}>
            GIF
          </button>
          <button type="button" className="send-btn" title="Send" onClick={onSend}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22 11 13 2 9l20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
