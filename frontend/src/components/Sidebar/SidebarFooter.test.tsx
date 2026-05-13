import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarFooter from './SidebarFooter';

describe('SidebarFooter', () => {
    const currentUser = {
        id: '1',
        email: 'alex@example.com',
        name: 'Alex',
        username: 'alex',
        initials: 'AR',
        role: 'Member',
        status: 'online' as const,
    };

    it('renders user presence and action buttons', () => {
        const onLogout = vi.fn();
        const onShowToast = vi.fn();

        render(
            <SidebarFooter
                currentUser={currentUser}
                currentPresence="away"
                onLogout={onLogout}
                onShowToast={onShowToast}
            />,
        );

        expect(screen.getByText('Alex')).toBeInTheDocument();
        expect(screen.getByText('Away')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Profile'));
        fireEvent.click(screen.getByTitle('Sign out'));

        expect(onShowToast).toHaveBeenCalledWith('Profile settings');
        expect(onLogout).toHaveBeenCalled();
    });
});
