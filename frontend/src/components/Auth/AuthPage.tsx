import { useActionState, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setCsrfCookieName } from '../../lib/api';
import type { ActionErrors, ActionResult, AuthMode, User } from '../../types/app';

const initialForm = {
  loginEmail: '',
  loginPassword: '',
  signupName: '',
  signupUsername: '',
  signupEmail: '',
  signupPassword: '',
  signupConfirmPassword: '',
  signupTerms: false,
  forgotEmail: '',
};

const initialActionResult: ActionResult = {
  errors: {},
};

type AuthPageProps = {
  mode: AuthMode;
  onLogin: (user: User) => void;
  onShowToast: (message: string) => void;
};

type AuthFormState = typeof initialForm;

export default function AuthPage({ mode, onLogin, onShowToast }: AuthPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<AuthFormState>(initialForm);
  const [errors, setErrors] = useState<ActionErrors>({});
  const [loginResult, loginAction, isLoginPending] = useActionState(handleLoginAction, initialActionResult);
  const [signupResult, signupAction, isSignupPending] = useActionState(handleSignupAction, initialActionResult);
  const [forgotResult, forgotAction, isForgotPending] = useActionState(handleForgotAction, initialActionResult);

  useEffect(() => {
    setErrors(
      mode === 'signup'
        ? signupResult.errors
        : mode === 'forgot'
          ? forgotResult.errors
          : loginResult.errors,
    );
  }, [forgotResult.errors, loginResult.errors, mode, signupResult.errors]);

  const passwordStrength = useMemo(() => {
    const value = form.signupPassword;
    let score = 0;

    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (!value) return { score: 0, label: '' };
    if (score <= 1) return { score, label: 'Weak' };
    if (score === 2) return { score, label: 'Fair' };
    if (score === 3) return { score, label: 'Good' };

    return { score, label: 'Strong' };
  }, [form.signupPassword]);

  function updateField(name: keyof AuthFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  }

  function finishAuth(response: { meta?: { csrfCookieName?: string }; message?: string; data: User }) {
    setCsrfCookieName(response.meta?.csrfCookieName);
    onShowToast(response.message || '');
    onLogin(response.data);
  }

  async function handleLoginAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
    const nextErrors: ActionErrors = {};
    const loginEmail = String(formData.get('loginEmail') || '').trim();
    const loginPassword = String(formData.get('loginPassword') || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      nextErrors.loginEmail = 'Enter a valid email address';
    }

    if (!loginPassword) {
      nextErrors.loginPassword = 'Password is required';
    }

    if (Object.keys(nextErrors).length) {
      return { errors: nextErrors };
    }

    try {
      const response = await api.post<User, { email: string; password: string }>('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });

      finishAuth(response);
      return initialActionResult;
    } catch (error) {
      return {
        errors: {
          loginPassword: error instanceof Error ? error.message : 'Login failed',
        },
      };
    }
  }

  async function handleSignupAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
    const nextErrors: ActionErrors = {};
    const signupName = String(formData.get('signupName') || '').trim();
    const signupUsername = String(formData.get('signupUsername') || '').trim();
    const signupEmail = String(formData.get('signupEmail') || '').trim();
    const signupPassword = String(formData.get('signupPassword') || '');
    const signupConfirmPassword = String(formData.get('signupConfirmPassword') || '');
    const signupTerms = formData.get('signupTerms') === 'on';

    if (signupName.length < 2) {
      nextErrors.signupName = 'At least 2 characters required';
    }

    if (!/^[a-zA-Z0-9_.]{3,}$/.test(signupUsername)) {
      nextErrors.signupUsername = '3+ chars, letters, numbers, _ or . only';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
      nextErrors.signupEmail = 'Enter a valid email address';
    }

    if (signupPassword.length < 8 || !/[A-Z]/.test(signupPassword)) {
      nextErrors.signupPassword = 'Min 8 chars with at least one uppercase letter';
    }

    if (signupPassword !== signupConfirmPassword) {
      nextErrors.signupConfirmPassword = 'Passwords do not match';
    }

    if (!signupTerms) {
      nextErrors.signupTerms = 'Please accept the Terms of Service';
    }

    if (Object.keys(nextErrors).length) {
      return { errors: nextErrors };
    }

    try {
      const response = await api.post<
        User,
        {
          name: string;
          username: string;
          email: string;
          password: string;
          confirmPassword: string;
          acceptTerms: boolean;
        }
      >('/auth/signup', {
        name: signupName,
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        acceptTerms: signupTerms,
      });

      finishAuth(response);
      return initialActionResult;
    } catch (error) {
      return {
        errors: {
          signupEmail: error instanceof Error ? error.message : 'Signup failed',
        },
      };
    }
  }

  async function handleForgotAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
    const forgotEmail = String(formData.get('forgotEmail') || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      return {
        errors: {
          forgotEmail: 'Enter a valid email address',
        },
      };
    }

    try {
      const response = await api.post<{ email: string; sentAt: string }, { email: string }>('/auth/forgot-password', {
        email: forgotEmail,
      });

      onShowToast(response.message);
      navigate('/forgot/sent');
      return initialActionResult;
    } catch (error) {
      return {
        errors: {
          forgotEmail: error instanceof Error ? error.message : 'Request failed',
        },
      };
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg">
        <div className="auth-orb" />
        <div className="auth-orb" />
        <div className="auth-orb" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <span className="auth-logo-text">Vox</span>
        </div>

        {(mode === 'login' || mode === 'signup') && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              type="button"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              type="button"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div className="auth-panel active">
            <div className="auth-heading">Welcome back</div>
            <div className="auth-sub">Sign in to continue your conversations</div>
            <form className="auth-form" action={loginAction}>
              <div className={`field ${errors.loginEmail ? 'error' : ''}`}>
                <label htmlFor="login-email">Email address</label>
                <div className="field-wrap">
                  <span className="field-icon">✉️</span>
                  <input
                    id="login-email"
                    name="loginEmail"
                    type="email"
                    value={form.loginEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                    onChange={(event) => updateField('loginEmail', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.loginEmail}</span>
              </div>

              <div className={`field ${errors.loginPassword ? 'error' : ''}`}>
                <label htmlFor="login-password">Password</label>
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input
                    id="login-password"
                    name="loginPassword"
                    type="password"
                    value={form.loginPassword}
                    placeholder="Your password"
                    autoComplete="current-password"
                    onChange={(event) => updateField('loginPassword', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.loginPassword}</span>
              </div>

              <button className={`auth-btn ${isLoginPending ? 'loading' : ''}`} type="submit">
                <span className="btn-text">Sign In →</span>
                <div className="btn-spinner" />
              </button>
            </form>

            <div className="auth-switch">
              No account?{' '}
              <button type="button" onClick={() => navigate('/signup')}>
                Create one free
              </button>
            </div>
            <div className="auth-switch">
              <button type="button" onClick={() => navigate('/forgot')}>
                Forgot password?
              </button>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div className="auth-panel active">
            <div className="auth-heading">Create your account</div>
            <div className="auth-sub">Join Vox and start messaging instantly</div>
            <form className="auth-form" action={signupAction}>
              <div className={`field ${errors.signupName ? 'error' : ''}`}>
                <label htmlFor="signup-name">Display name</label>
                <div className="field-wrap">
                  <span className="field-icon">😊</span>
                  <input
                    id="signup-name"
                    name="signupName"
                    type="text"
                    value={form.signupName}
                    placeholder="Aria Chen"
                    autoComplete="name"
                    onChange={(event) => updateField('signupName', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.signupName}</span>
              </div>

              <div className={`field ${errors.signupUsername ? 'error' : ''}`}>
                <label htmlFor="signup-username">Username</label>
                <div className="field-wrap">
                  <span className="field-icon">@</span>
                  <input
                    id="signup-username"
                    name="signupUsername"
                    type="text"
                    value={form.signupUsername}
                    placeholder="aria_chen"
                    autoComplete="username"
                    onChange={(event) => updateField('signupUsername', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.signupUsername}</span>
              </div>

              <div className={`field ${errors.signupEmail ? 'error' : ''}`}>
                <label htmlFor="signup-email">Email address</label>
                <div className="field-wrap">
                  <span className="field-icon">✉️</span>
                  <input
                    id="signup-email"
                    name="signupEmail"
                    type="email"
                    value={form.signupEmail}
                    placeholder="aria@example.com"
                    autoComplete="email"
                    onChange={(event) => updateField('signupEmail', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.signupEmail}</span>
              </div>

              <div className={`field ${errors.signupPassword ? 'error' : ''}`}>
                <label htmlFor="signup-password">Password</label>
                <div className="field-wrap">
                  <span className="field-icon">🔒</span>
                  <input
                    id="signup-password"
                    name="signupPassword"
                    type="password"
                    value={form.signupPassword}
                    placeholder="Min 8 chars, 1 uppercase"
                    autoComplete="new-password"
                    onChange={(event) => updateField('signupPassword', event.target.value)}
                  />
                </div>
                <div className={`pwd-strength ${passwordStrength.score ? 'show' : ''}`}>
                  {[0, 1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className={`pwd-bar ${
                        passwordStrength.score > bar
                          ? passwordStrength.score >= 4
                            ? 's'
                            : passwordStrength.score >= 3
                              ? 'm'
                              : 'w'
                          : ''
                      }`}
                    />
                  ))}
                </div>
                <div className="pwd-label">{passwordStrength.label}</div>
                <span className="field-error">{errors.signupPassword}</span>
              </div>

              <div className={`field ${errors.signupConfirmPassword ? 'error' : ''}`}>
                <label htmlFor="signup-confirm-password">Confirm password</label>
                <div className="field-wrap">
                  <span className="field-icon">🔐</span>
                  <input
                    id="signup-confirm-password"
                    name="signupConfirmPassword"
                    type="password"
                    value={form.signupConfirmPassword}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    onChange={(event) => updateField('signupConfirmPassword', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.signupConfirmPassword}</span>
              </div>

              <label className="checkbox-row">
                <input
                  name="signupTerms"
                  type="checkbox"
                  checked={form.signupTerms}
                  onChange={(event) => updateField('signupTerms', event.target.checked)}
                />
                <span>I agree to the Terms of Service and Privacy Policy</span>
              </label>
              <span className="field-error terms-error">{errors.signupTerms}</span>

              <button className={`auth-btn ${isSignupPending ? 'loading' : ''}`} type="submit">
                <span className="btn-text">Create Account →</span>
                <div className="btn-spinner" />
              </button>
            </form>

            <div className="auth-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="auth-panel active">
            <button className="auth-back" type="button" onClick={() => navigate('/login')}>
              ← Back to sign in
            </button>
            <div className="auth-heading">Forgot password?</div>
            <div className="auth-sub">Enter your email and we&apos;ll send you a reset link.</div>
            <form className="auth-form" action={forgotAction}>
              <div className={`field ${errors.forgotEmail ? 'error' : ''}`}>
                <label htmlFor="forgot-email">Email address</label>
                <div className="field-wrap">
                  <span className="field-icon">✉️</span>
                  <input
                    id="forgot-email"
                    name="forgotEmail"
                    type="email"
                    value={form.forgotEmail}
                    placeholder="you@example.com"
                    onChange={(event) => updateField('forgotEmail', event.target.value)}
                  />
                </div>
                <span className="field-error">{errors.forgotEmail}</span>
              </div>

              <button className={`auth-btn ${isForgotPending ? 'loading' : ''}`} type="submit">
                <span className="btn-text">Send Reset Link</span>
                <div className="btn-spinner" />
              </button>
            </form>
          </div>
        )}

        {mode === 'forgotOk' && (
          <div className="auth-success">
            <div className="success-icon">📬</div>
            <h3>Request received</h3>
            <p>If an account exists for that email, the backend has recorded the request. Reset email delivery is not wired yet.</p>
            <button className="auth-btn" type="button" onClick={() => navigate('/login')}>
              <span className="btn-text">Back to Sign In</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
