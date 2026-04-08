import { render, screen } from '@testing-library/react';
import CallBanner from './CallBanner';
import { describe, it, expect, vi } from 'vitest';

describe('CallBanner', () => {
    it('does not render when not visible', () => {
        const { container } = render(
            <CallBanner activeConversation={} isVisible={false} callSeconds={0} onEndCall={vi.fn()} />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders timer correctly', () => {
        render(
            <CallBanner
                isVisible
                callSeconds={65}
                activeConversation={{ name: 'John' }}
                onEndCall={vi.fn()}
            />,
        );

        expect(screen.getByText('1:05')).toBeInTheDocument();
    });
});