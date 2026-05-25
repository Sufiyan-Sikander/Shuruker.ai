import { useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { flaskBaseUrl } from './authConfig';

function AuthPage({ mode = 'login' }) {
  const isFreelancer = mode === 'freelancer';
  const [activeForm, setActiveForm] = useState('signup');
  const [loadingKey, setLoadingKey] = useState('');
  const [errorState, setErrorState] = useState({ signup: '', signin: '' });
  const [successMessage, setSuccessMessage] = useState('');

  const loginParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const nextPath = loginParams.get('next') || (isFreelancer ? '/freelancer-inbox' : '/chat');

  const showSuccess = (message, redirectTo = nextPath) => {
    setSuccessMessage(message);
    window.setTimeout(() => {
      window.location.href = redirectTo;
    }, 900);
  };

  const verifyToken = async (user) => {
    const idToken = await user.getIdToken();

    const verifyResponse = await fetch(`${flaskBaseUrl}/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!verifyResponse.ok) {
      throw new Error('Session verification failed. Please try again.');
    }

    return verifyResponse.json();
  };

  const validateFreelancer = async (user) => {
    await verifyToken(user);

    const meResponse = await fetch(`${flaskBaseUrl}/api/me`);
    const meData = await meResponse.json();

    if (!meResponse.ok) {
      throw new Error('Could not validate freelancer account.');
    }

    if (!meData.isFreelancer) {
      throw new Error('This email is not registered as a freelancer account.');
    }

    if (!meData.isApprovedFreelancer) {
      throw new Error('Your freelancer account is pending admin approval.');
    }

    showSuccess('Signed in successfully!', '/freelancer-inbox');
  };

  const handleEmailSignup = async (event) => {
    event.preventDefault();
    setErrorState((current) => ({ ...current, signup: '' }));

    const email = event.currentTarget.signupEmail.value.trim();
    const password = event.currentTarget.signupPassword.value;
    const confirm = event.currentTarget.signupConfirm.value;

    if (password !== confirm) {
      setErrorState((current) => ({ ...current, signup: 'Passwords do not match' }));
      return;
    }

    if (password.length < 6) {
      setErrorState((current) => ({ ...current, signup: 'Password must be at least 6 characters' }));
      return;
    }

    setLoadingKey('signup');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (isFreelancer) {
        await verifyToken(result.user);
        showSuccess('Account created successfully!', '/freelancer-inbox');
      } else {
        await verifyToken(result.user);
        showSuccess('Account created successfully!', nextPath);
      }
    } catch (error) {
      setErrorState((current) => ({ ...current, signup: error.message }));
    } finally {
      setLoadingKey('');
    }
  };

  const handleEmailSignin = async (event) => {
    event.preventDefault();
    setErrorState((current) => ({ ...current, signin: '' }));

    const email = event.currentTarget.signinEmail.value.trim();
    const password = event.currentTarget.signinPassword.value;

    setLoadingKey('signin');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (isFreelancer) {
        await validateFreelancer(result.user);
      } else {
        await verifyToken(result.user);
        showSuccess('Signed in successfully!', nextPath);
      }
    } catch (error) {
      setErrorState((current) => ({ ...current, signin: error.message }));
    } finally {
      setLoadingKey('');
    }
  };

  const handleGoogleSignup = async () => {
    setLoadingKey('google-signup');
    setErrorState((current) => ({ ...current, signup: '' }));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (isFreelancer) {
        await validateFreelancer(result.user);
      } else {
        await verifyToken(result.user);
        showSuccess('Account created with Google!', nextPath);
      }
    } catch (error) {
      setErrorState((current) => ({ ...current, signup: error.message }));
    } finally {
      setLoadingKey('');
    }
  };

  const handleGoogleSignin = async () => {
    setLoadingKey('google-signin');
    setErrorState((current) => ({ ...current, signin: '' }));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (isFreelancer) {
        await validateFreelancer(result.user);
      } else {
        await verifyToken(result.user);
        showSuccess('Signed in with Google!', nextPath);
      }
    } catch (error) {
      setErrorState((current) => ({ ...current, signin: error.message }));
    } finally {
      setLoadingKey('');
    }
  };

  const titleText = isFreelancer ? 'Freelancer Login' : 'Welcome Back';
  const subtitleText = isFreelancer
    ? 'Sign in with your registered freelancer account'
    : 'Sign in to your ShurukerAi account';

  return (
    <div className={isFreelancer ? 'freelancer-login-page' : 'login-page'}>
      <div id="authContainer" className="login-container">
        {successMessage ? (
          <div id="successMessage" className="success-message show">
            <div className="success-icon">✓</div>
            <h2>Success!</h2>
            <p id="successText">{successMessage}</p>
          </div>
        ) : (
          <>
            {!isFreelancer && (
              <form id="signUpForm" className={`auth-form ${activeForm === 'signup' ? 'active' : ''}`} onSubmit={handleEmailSignup}>
                <div className="login-header">
                  <div className="logo">S</div>
                  <h1>Create Account</h1>
                  <p>Join ShurukerAi and start your business journey</p>
                </div>

                <div className="oauth-buttons">
                  <button type="button" className="oauth-button" id="googleSignUp" onClick={handleGoogleSignup} disabled={loadingKey === 'google-signup'}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {loadingKey === 'google-signup' ? 'Signing up...' : 'Sign up with Google'}
                  </button>
                </div>

                <div className="divider">
                  <div className="divider-line"></div>
                  <div className="divider-text">OR</div>
                  <div className="divider-line"></div>
                </div>

                <div className="form-group">
                  <label htmlFor="signupEmail">Email</label>
                  <input type="email" id="signupEmail" name="signupEmail" placeholder="you@example.com" required />
                </div>

                <div className="form-group">
                  <label htmlFor="signupPassword">Password</label>
                  <input type="password" id="signupPassword" name="signupPassword" placeholder="At least 6 characters" required />
                </div>

                <div className="form-group">
                  <label htmlFor="signupConfirm">Confirm Password</label>
                  <input type="password" id="signupConfirm" name="signupConfirm" placeholder="Confirm your password" required />
                </div>

                <div className={`error-message ${errorState.signup ? 'show' : ''}`}>{errorState.signup}</div>

                <button type="submit" className="auth-button" id="signupBtn" disabled={loadingKey === 'signup'}>
                  {loadingKey === 'signup' ? 'Creating account...' : 'Create Account'}
                </button>

                <div className="toggle-form">
                  Already have an account? <button type="button" id="toggleToLogin" onClick={() => setActiveForm('signin')}>Sign In</button>
                </div>
              </form>
            )}

            <form id="signInForm" className={`auth-form ${isFreelancer || activeForm === 'signin' ? 'active' : ''}`} onSubmit={handleEmailSignin}>
              <div className="login-header">
                <div className="logo">{isFreelancer ? 'F' : 'S'}</div>
                <h1>{titleText}</h1>
                <p>{subtitleText}</p>
              </div>

              <div className="oauth-buttons">
                <button type="button" className="oauth-button" id="googleSignIn" onClick={handleGoogleSignin} disabled={loadingKey === 'google-signin'}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {loadingKey === 'google-signin' ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>

              <div className="divider">
                <div className="divider-line"></div>
                <div className="divider-text">OR</div>
                <div className="divider-line"></div>
              </div>

              <div className="form-group">
                <label htmlFor="signinEmail">Email</label>
                <input type="email" id="signinEmail" name="signinEmail" placeholder="you@example.com" required />
              </div>

              <div className="form-group">
                <label htmlFor="signinPassword">Password</label>
                <input type="password" id="signinPassword" name="signinPassword" placeholder="Your password" required />
              </div>

              <div className={`error-message ${errorState.signin ? 'show' : ''}`}>{errorState.signin}</div>

              <button type="submit" className="auth-button" id="signinBtn" disabled={loadingKey === 'signin'}>
                {loadingKey === 'signin' ? 'Signing in...' : isFreelancer ? 'Sign In as Freelancer' : 'Sign In'}
              </button>

              {!isFreelancer && (
                <div className="toggle-form">
                  Don't have an account? <button type="button" id="toggleToSignup" onClick={() => setActiveForm('signup')}>Create Account</button>
                </div>
              )}
            </form>

            {isFreelancer && (
              <div className="helper-links">
                Not registered as freelancer? <a href={`${flaskBaseUrl}/register-freelancer`}>Apply here</a><br />
                General user login: <a href={`${flaskBaseUrl}/login`}>Open login</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AuthPage;