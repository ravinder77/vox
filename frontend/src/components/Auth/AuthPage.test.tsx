import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthPage from './AuthPage';

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('../../lib/api', () => ({
    api: {
        post: vi.fn(),
    },
    setCsrfCookieName: vi.fn(),
}));

describe('AuthPage', () => {
    const onLogin = vi.fn();
    const onShowToast = vi.fn();

    it('renders login mode', () => {
        render(<AuthPage mode="login" onLogin={onLogin} onShowToast={onShowToast} />);
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('shows validation error for invalid email', async () => {
        render(<AuthPage mode="login" onLogin={onLogin} onShowToast={onShowToast} />);

        fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
            target: { value: 'invalid' },
        });

        fireEvent.click(screen.getByText(/sign in/i));

        await waitFor(() => {
            expect(screen.getByText(/valid email/i)).toBeInTheDocument();
        });
    });

    it('signup password strength indicator works', () => {
        render(<AuthPage mode="signup" onLogin={onLogin} onShowToast={onShowToast} />);

        fireEvent.change(screen.getByPlaceholderText(/min 8 chars/i), {
            target: { value: 'StrongP1!' },
        });

        expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('forgot password validation', async () => {
        render(<AuthPage mode="forgot" onLogin={onLogin} onShowToast={onShowToast} />);

        fireEvent.click(screen.getByText(/send reset link/i));

        await waitFor(() => {
            expect(screen.getByText(/valid email/i)).toBeInTheDocument();
        });
    });
});