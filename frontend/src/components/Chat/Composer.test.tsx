import { render, screen, fireEvent } from '@testing-library/react';
import Composer from './Composer';
import { describe, it, expect, vi } from 'vitest';

describe('Composer', () => {
    it('calls onChange when typing', () => {
        const onChange = vi.fn();

        render(
            <Composer
                composerValue=""
                isEmojiOpen={false}
                onAddEmoji={vi.fn()}
                onChange={onChange}
                onNotImplemented={vi.fn()}
                onSend={vi.fn()}
                onToggleEmoji={vi.fn()}
            />,
        );

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'hello' },
        });

        expect(onChange).toHaveBeenCalled();
    });

    it('sends message on Enter', () => {
        const onSend = vi.fn();

        render(
            <Composer
                composerValue=""
                isEmojiOpen={false}
                onAddEmoji={vi.fn()}
                onChange={vi.fn()}
                onNotImplemented={vi.fn()}
                onSend={onSend}
                onToggleEmoji={vi.fn()}
            />,
        );

        fireEvent.keyDown(screen.getByRole('textbox'), {
            key: 'Enter',
        });

        expect(onSend).toHaveBeenCalled();
    });
});