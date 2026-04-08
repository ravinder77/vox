import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NewChatPanel from './NewChatPanel';

const baseProps = {
    groupName: '',
    isCreatingConversation: false,
    isLoading: false,
    isOpen: true,
    mode: 'direct',
    onCreateDirect: vi.fn(),
    onCreateGroup: vi.fn(),
    onGroupNameChange: vi.fn(),
    onModeChange: vi.fn(),
    onSearchChange: vi.fn(),
    onToggleUser: vi.fn(),
    searchQuery: '',
    selectedUserIds: [],
    users: [
        { id: '1', name: 'Alex', username: 'alex', email: 'alex@example.com' },
        { id: '2', name: 'Sam', username: 'sam', email: 'sam@example.com' },
    ],
};

describe('NewChatPanel', () => {
    it('does not render when closed', () => {
        render(<NewChatPanel {...baseProps} isOpen={false} />);

        expect(screen.queryByText(/direct/i)).not.toBeInTheDocument();
    });

    it('creates a direct chat from the user row', () => {
        const onCreateDirect = vi.fn();

        render(<NewChatPanel {...baseProps} onCreateDirect={onCreateDirect} />);

        fireEvent.click(screen.getByRole('button', { name: /alex/i }));
        expect(onCreateDirect).toHaveBeenCalledWith('1');
    });

    it('renders group mode controls and toggles selections', () => {
        const onModeChange = vi.fn();
        const onGroupNameChange = vi.fn();
        const onSearchChange = vi.fn();
        const onToggleUser = vi.fn();
        const onCreateGroup = vi.fn();

        render(
            <NewChatPanel
                {...baseProps}
                mode="group"
                groupName="Launch team"
                searchQuery="alex"
                selectedUserIds={['1']}
                onModeChange={onModeChange}
                onGroupNameChange={onGroupNameChange}
                onSearchChange={onSearchChange}
                onToggleUser={onToggleUser}
                onCreateGroup={onCreateGroup}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /direct/i }));
        fireEvent.change(screen.getByPlaceholderText(/group name/i), {
            target: { value: 'Core team' },
        });
        fireEvent.change(screen.getByPlaceholderText(/search users/i), {
            target: { value: 'sam' },
        });
        fireEvent.click(screen.getByRole('button', { name: /selected/i }));
        fireEvent.click(screen.getByRole('button', { name: /create group \(1\)/i }));

        expect(onModeChange).toHaveBeenCalledWith('direct');
        expect(onGroupNameChange).toHaveBeenCalledWith('Core team');
        expect(onSearchChange).toHaveBeenCalledWith('sam');
        expect(onToggleUser).toHaveBeenCalledWith('1');
        expect(onCreateGroup).toHaveBeenCalled();
    });

    it('shows loading and empty states', () => {
        const { rerender } = render(<NewChatPanel {...baseProps} isLoading users={[]} />);
        expect(screen.getByText(/searching users/i)).toBeInTheDocument();

        rerender(<NewChatPanel {...baseProps} users={[]} />);
        expect(screen.getByText(/no users found yet/i)).toBeInTheDocument();
    });

    it('disables group creation when required inputs are missing', () => {
        render(
            <NewChatPanel
                {...baseProps}
                mode="group"
                users={[]}
                groupName=""
                selectedUserIds={[]}
            />,
        );

        expect(screen.getByRole('button', { name: /create group \(0\)/i })).toBeDisabled();
    });
});
