import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthPage from './AuthPage';

// ---- mocks ----
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

const mockPost = vi.fn();
const mockSetCsrfCookieName = vi.fn();

vi.mock('../../lib/api', () => ({
    api: {
        post: (...args: any[]) => mockPost(...args),
    },
    setCsrfCookieName: (...args: any[]) => mockSetCsrfCookieName(...args),
}));

// ---- helpers ----
const mockUser = {
    id: '1',
    name: 'Alex',
    email: 'alex@test.com',
};

function renderAuth(mode: 'login' | 'signup' | 'forgot' = 'login') {
    const onLogin = vi.fn();
    const onShowToast = vi.fn();

    render(<AuthPage mode={mode} onLogin={onLogin} onShowToast={onShowToast} />);

    return { onLogin, onShowToast };
}

// ---- tests ----
describe('AuthPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ================= LOGIN =================
    it('renders login mode', () => {
        renderAuth('login');

        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in →/i })).toBeInTheDocument();
    });

    it('shows validation error for invalid email', async () => {
        renderAuth('login');

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'user@example' },
        });

        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'password123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /sign in →/i }));

        await waitFor(() => {
            expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
        });
    });

    it('successful login calls onLogin and toast', async () => {
        const { onLogin, onShowToast } = renderAuth('login');

        mockPost.mockResolvedValue({
            data: mockUser,
            message: 'Login success',
            meta: { csrfCookieName: 'csrf' },
        });

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'test@example.com' },
        });

        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'password123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /sign in →/i }));

        await waitFor(() => {
            expect(onLogin).toHaveBeenCalledWith(mockUser);
            expect(onShowToast).toHaveBeenCalledWith('Login success');
            expect(mockSetCsrfCookieName).toHaveBeenCalledWith('csrf');
        });
    });

    it('login API error shows message', async () => {
        renderAuth('login');

        mockPost.mockRejectedValue(new Error('Invalid credentials'));

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'test@example.com' },
        });

        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'password123' },
        });

        fireEvent.click(screen.getByRole('button', { name: /sign in →/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });

    // ================= SIGNUP =================
    it('signup password strength indicator works', () => {
        renderAuth('signup');

        fireEvent.change(screen.getByLabelText(/^password$/i), {
            target: { value: 'Password1' },
        });

        expect(screen.getByText(/good/i)).toBeInTheDocument();
    });

    it('signup validation: password mismatch', async () => {
        renderAuth('signup');

        fireEvent.change(screen.getByLabelText(/display name/i), {
            target: { value: 'Alex' },
        });

        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'alex123' },
        });

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'test@example.com' },
        });

        fireEvent.change(screen.getByLabelText(/^password$/i), {
            target: { value: 'Password1' },
        });

        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: 'Different1' },
        });

        fireEvent.click(screen.getByRole('checkbox'));

        fireEvent.click(screen.getByRole('button', { name: /create account →/i }));

        await waitFor(() => {
            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });
    });

    // ================= FORGOT =================
    it('forgot password validation', async () => {
        renderAuth('forgot');

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'user@example' },
        });

        fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

        await waitFor(() => {
            expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
        });
    });

    it('forgot password success navigates', async () => {
        const { onShowToast } = renderAuth('forgot');

        mockPost.mockResolvedValue({
            message: 'Email sent',
        });

        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'test@example.com' },
        });

        fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

        await waitFor(() => {
            expect(onShowToast).toHaveBeenCalledWith('Email sent');
            expect(mockNavigate).toHaveBeenCalledWith('/forgot/sent');
        });
    });

    it('signup success calls onLogin and toast', async () => {
        const { onLogin, onShowToast } = renderAuth('signup');

        mockPost.mockResolvedValue({
            data: mockUser,
            message: 'Signup success',
            meta: { csrfCookieName: 'signup_csrf' },
        });

        fireEvent.change(screen.getByLabelText(/display name/i), {
            target: { value: 'Alex' },
        });
        fireEvent.change(screen.getByLabelText(/username/i), {
            target: { value: 'alex_123' },
        });
        fireEvent.change(screen.getByLabelText(/email address/i), {
            target: { value: 'alex@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/^password$/i), {
            target: { value: 'Password1!' },
        });
        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: 'Password1!' },
        });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /create account →/i }));

        await waitFor(() => {
            expect(onLogin).toHaveBeenCalledWith(mockUser);
            expect(onShowToast).toHaveBeenCalledWith('Signup success');
            expect(mockSetCsrfCookieName).toHaveBeenCalledWith('signup_csrf');
        });
    });

    it('navigates between auth routes from actions', () => {
        renderAuth('login');

        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        fireEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));

        expect(mockNavigate).toHaveBeenCalledWith('/signup');
        expect(mockNavigate).toHaveBeenCalledWith('/forgot');
    });

    it('renders forgot confirmation mode', () => {
        renderAuth('forgotOk' as 'login');

        expect(screen.getByText(/request received/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
});
