import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';

const currentUser = {
  id: '1',
  email: 'alex@example.com',
  name: 'Alex Rivera',
  username: 'alex_r',
  initials: 'AR',
  role: 'Product Lead',
  status: 'online' as const,
};

describe('SettingsPanel', () => {
  it('does not render when closed', () => {
    render(
      <SettingsPanel
        currentPresence="online"
        currentUser={currentUser}
        isOpen={false}
        onClose={vi.fn()}
        onLogout={vi.fn()}
        onResetSidebar={vi.fn()}
        onSetPresence={vi.fn()}
      />,
    );

    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('renders as a floating window and closes on backdrop click', () => {
    const onClose = vi.fn();

    render(
      <SettingsPanel
        currentPresence="away"
        currentUser={currentUser}
        isOpen
        onClose={onClose}
        onLogout={vi.fn()}
        onResetSidebar={vi.fn()}
        onSetPresence={vi.fn()}
      />,
    );

    expect(screen.getByText('Manage your session and sidebar preferences')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Manage your session and sidebar preferences').closest('.settings-modal-backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dispatches actions from the settings buttons', () => {
    const onSetPresence = vi.fn();
    const onResetSidebar = vi.fn();
    const onLogout = vi.fn();

    render(
      <SettingsPanel
        currentPresence="online"
        currentUser={currentUser}
        isOpen
        onClose={vi.fn()}
        onLogout={onLogout}
        onResetSidebar={onResetSidebar}
        onSetPresence={onSetPresence}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set away' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters and close panels' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(onSetPresence).toHaveBeenCalledWith('away');
    expect(onResetSidebar).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
