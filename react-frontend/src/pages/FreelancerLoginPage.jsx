import { useMemo, useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { flaskBaseUrl } from '../authConfig';

export default function FreelancerLoginPage() {
  const [loadingKey, setLoadingKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const loginParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const nextPath = loginParams.get('next') || '/freelancer-inbox';

  const verifyAndValidateFreelancer = async (user) => {
    const idToken = await user.getIdToken();

    const verifyResponse = await fetch(`${flaskBaseUrl}/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!verifyResponse.ok) {
      throw new Error('Session verification failed. Please try again.');
    }

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

    window.location.href = nextPath;
  };

  const handleEmailSignin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setLoadingKey('signin');

    try {
      const email = event.currentTarget.signinEmail.value.trim();
      const password = event.currentTarget.signinPassword.value;
      const result = await signInWithEmailAndPassword(auth, email, password);
      await verifyAndValidateFreelancer(result.user);
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please try again.');
    } finally {
      setLoadingKey('');
    }
  };

  const handleGoogleSignin = async () => {
    setErrorMessage('');
    setLoadingKey('google');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await verifyAndValidateFreelancer(result.user);
    } catch (error) {
      setErrorMessage(error.message || 'Google login failed.');
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <div className="freelancer-login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo">F</div>
          <h1>Freelancer Login</h1>
          <p>Sign in with your registered freelancer account</p>
        </div>

        <button type="button" className="oauth-button" id="googleSignIn" onClick={handleGoogleSignin}>
          {loadingKey === 'google' ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="divider">
          <div className="divider-line"></div>
          <div className="divider-text">OR</div>
          <div className="divider-line"></div>
        </div>

        <form id="signInForm" onSubmit={handleEmailSignin}>
          <div className="form-group">
            <label htmlFor="signinEmail">Email</label>
            <input type="email" id="signinEmail" name="signinEmail" placeholder="freelancer@email.com" required />
          </div>

          <div className="form-group">
            <label htmlFor="signinPassword">Password</label>
            <input type="password" id="signinPassword" name="signinPassword" placeholder="Your password" required />
          </div>

          <button type="submit" className="auth-button" id="signinBtn" disabled={loadingKey === 'signin'}>
            {loadingKey === 'signin' ? 'Signing in...' : 'Sign In as Freelancer'}
          </button>

          <div className={`error-message ${errorMessage ? 'show' : ''}`} id="signinError">
            {errorMessage}
          </div>
        </form>

        <div className="helper-links">
          Not registered as freelancer? <a href="/register-freelancer">Apply here</a><br />
          General user login: <a href="/login">Open login</a>
        </div>
      </div>
    </div>
  );
}