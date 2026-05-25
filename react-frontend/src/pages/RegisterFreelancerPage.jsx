import { useEffect, useState } from 'react';

export default function RegisterFreelancerPage() {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const user = await response.json();
          if (user.email) {
            const emailInput = document.getElementById('email');
            if (emailInput) {
              emailInput.value = user.email;
              emailInput.readOnly = true;
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    loadCurrentUser();
  }, []);

  const updateFileName = () => {
    const input = document.getElementById('portfolioFile');
    if (input?.files?.length) {
      setFileName(input.files[0].name);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch('/api/register-freelancer', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Registration failed');
      }

      setSuccessMessage('Registration successful! Your profile will be live soon.');
      event.currentTarget.reset();
      setFileName('');
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a className="brand" href="/" aria-label="ShurukerAi home">
            <div className="logo"><img src="/static/images/logo2.png" alt="ShurukerAi logo" /></div>
            <div className="brand-text">
              <span className="brand-name">ShurukerAi</span>
              <small className="brand-slogan">Pakistan's Smart Business Launch Partner</small>
            </div>
          </a>

          <nav className="nav-links">
            <a href="/">Home</a>
            <a href="/#features">Features</a>
            <a href="/explore">Explore</a>
            <a href="/freelancer-login">Freelancer Login</a>
            <a className="signin" href="/login">Sign In</a>
          </nav>
        </div>
      </header>

      <main className="freelancer-container">
        <div className="freelancer-form">
          <div className="form-header">
            <h1>Join Our Expert Network</h1>
            <p>Share your expertise and help Pakistani entrepreneurs succeed</p>
          </div>

          <div className="success-message" style={{ display: successMessage ? 'block' : 'none' }}>
            ✓ {successMessage}
          </div>

          <div className="error-message" style={{ display: errorMessage ? 'block' : 'none' }}>
            {errorMessage}
          </div>

          <form id="freelancerForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input type="text" id="fullName" name="fullName" required placeholder="e.g., Ahmed Khan" />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input type="email" id="email" name="email" required placeholder="your@email.com" />
            </div>

            <div className="form-group">
              <label htmlFor="category">Specialization *</label>
              <select id="category" name="category" required>
                <option value="">Select your category</option>
                <option value="Ad Manager">Ad Manager</option>
                <option value="Marketing Consultant">Marketing Consultant</option>
                <option value="Strategic Planner">Strategic Planner</option>
                <option value="Business Consultant">Business Consultant</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bio">About You / Your Experience *</label>
              <textarea id="bio" name="bio" required placeholder="Tell us about your experience, skills, and what you can help entrepreneurs with..."></textarea>
              <small>Minimum 50 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="portfolioLink">Portfolio Website / LinkedIn (Optional)</label>
              <input type="url" id="portfolioLink" name="portfolioLink" placeholder="https://yourportfolio.com" />
            </div>

            <div className="form-group">
              <label>Portfolio/Past Work (PDF) *</label>
              <div className="file-upload">
                <input type="file" id="portfolioFile" name="portfolioFile" accept=".pdf" onChange={updateFileName} />
                <label htmlFor="portfolioFile">
                  <div className="file-upload-content">
                    <div className="file-upload-icon">📄</div>
                    <div className="file-upload-text">Click to upload or drag and drop</div>
                    <div className="file-upload-hint">PDF up to 10MB</div>
                  </div>
                </label>
                <div className={`file-name ${fileName ? 'active' : ''}`}>{fileName}</div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => window.history.back()}>Cancel</button>
              <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Uploading your profile...' : 'Submit Application'}</button>
            </div>

            <div className="loading" style={{ display: loading ? 'block' : 'none' }}>
              <div className="spinner"></div>
              <div className="loading-text">Uploading your profile...</div>
            </div>
          </form>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">© 2025 ShurukerAi — Built for Pakistani entrepreneurs.</div>
      </footer>
    </>
  );
}
