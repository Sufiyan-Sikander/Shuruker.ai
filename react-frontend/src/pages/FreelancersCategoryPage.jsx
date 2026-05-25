import { useEffect, useMemo, useState } from 'react';

export default function FreelancersCategoryPage() {
  const category = useMemo(() => decodeURIComponent(window.location.pathname.split('/').pop() || ''), []);
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadFreelancersByCategory = async () => {
      try {
        const response = await fetch(`/api/freelancers?category=${encodeURIComponent(category)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load specialists');
        }

        if (!cancelled) {
          setFreelancers(Array.isArray(data.freelancers) ? data.freelancers : []);
        }
      } catch (error) {
        console.error('Error loading freelancers:', error);
        if (!cancelled) {
          setFreelancers([]);
          setErrorMessage(error.message || 'Failed to load specialists');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFreelancersByCategory();
    return () => {
      cancelled = true;
    };
  }, [category]);

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
            <a href="/freelancers">All Specialists</a>
            <div className="nav-dropdown">
              <a href="/freelancers" className="dropdown-toggle">Services</a>
              <div className="dropdown-menu">
                <a href="/register-freelancer">Register as Freelancer</a>
                <a href="/freelancer-login">Freelancer Login</a>
                <a href="/freelancers">Find Freelancer</a>
              </div>
            </div>
            <a className="signin" href="/login">Sign In</a>
          </nav>
        </div>
      </header>

      <main className="freelancers-category-page">
        <section className="category-hero">
          <div className="category-hero-content">
            <div className="breadcrumb">
              <a href="/freelancers">All Specialists</a> / <span>{category}</span>
            </div>
            <h1>{category}</h1>
            <p>Connect with expert {category.toLowerCase()}s ready to help your business grow</p>
          </div>
        </section>

        <section className="category-content">
          <div className="results-info">
            Showing <strong id="resultCount">{freelancers.length}</strong> specialist<span id="pluralText">{freelancers.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div id="freelancersContainer">
              <div className="loading">
                <div className="spinner"></div>
                <div style={{ marginTop: '12px', color: '#666' }}>Loading specialists...</div>
              </div>
            </div>
          ) : errorMessage ? (
            <div id="freelancersContainer">
              <p style={{ textAlign: 'center', color: '#d32f2f' }}>{errorMessage}</p>
            </div>
          ) : freelancers.length > 0 ? (
            <div className="freelancers-list" id="freelancersContainer">
              {freelancers.map((freelancer) => (
                <div className="freelancer-card" key={freelancer.id || `${freelancer.fullName}-${freelancer.email}`}>
                  <div className="freelancer-header">
                    <div className="freelancer-info">
                      <h3>{freelancer.fullName}</h3>
                      <div className="freelancer-email">{freelancer.email}</div>
                    </div>
                    <div className="rating">
                      {'★'.repeat(Math.floor(freelancer.rating || 0))}{'☆'.repeat(5 - Math.floor(freelancer.rating || 0))}
                      <span>{freelancer.rating || 'New'}</span>
                    </div>
                  </div>
                  <div className="freelancer-bio">{freelancer.bio}</div>
                  <div className="freelancer-footer">
                    <div className="freelancer-links">
                      {freelancer.portfolioPdfUrl ? (
                        <a href={freelancer.portfolioPdfUrl} target="_blank" rel="noreferrer" className="btn-small secondary" title="View Portfolio">📄 Portfolio</a>
                      ) : null}
                      {freelancer.portfolioLink ? (
                        <a href={freelancer.portfolioLink} target="_blank" rel="noreferrer" className="btn-small secondary">🔗 Website</a>
                      ) : null}
                    </div>
                    <a href={`/client-messages?freelancer=${encodeURIComponent(freelancer.id)}`} className="btn-small primary">💬 Message Now</a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div id="freelancersContainer">
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No Specialists Found Yet</div>
                <div className="empty-state-text">Be the first to join as a {category} and start helping entrepreneurs!</div>
                <a href="/register-freelancer" className="btn primary">Register Now</a>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">© 2025 ShurukerAi — Built for Pakistani entrepreneurs.</div>
      </footer>
    </>
  );
}
