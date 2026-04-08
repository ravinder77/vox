import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
    it('emits updated values', () => {
        const onChange = vi.fn();

        render(<SearchBar value="" onChange={onChange} />);

        fireEvent.change(screen.getByPlaceholderText(/search messages, people/i), {
            target: { value: 'alex' },
        });

        expect(onChange).toHaveBeenCalledWith('alex');
    });
});
