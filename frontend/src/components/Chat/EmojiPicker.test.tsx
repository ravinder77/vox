import { render, screen, fireEvent } from '@testing-library/react';
import EmojiPicker from './EmojiPicker';
import { describe, it, expect, vi } from 'vitest';

describe('EmojiPicker', () => {
    it('renders emojis when open', () => {
        render(<EmojiPicker isOpen onAdd={vi.fn()} />);
        expect(screen.getByText('😊')).toBeInTheDocument();
    });

    it('calls onAdd when clicked', () => {
        const onAdd = vi.fn();

        render(<EmojiPicker isOpen onAdd={onAdd} />);
        fireEvent.click(screen.getByText('😊'));

        expect(onAdd).toHaveBeenCalledWith('😊');
    });
});