import { useEffect, useMemo, useState } from 'react';
import { flaskBaseUrl } from '../authConfig';

export default function FreelancersPage() {
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadFreelancers = async () => {
      try {
        const response = await fetch('/api/freelancers');
        const data = await response.json();
        if (!cancelled) {
          setFreelancers(Array.isArray(data.freelancers) ? data.freelancers : []);
        }
      } catch (error) {
        console.error('Error loading freelancers:', error);
        if (!cancelled) setFreelancers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFreelancers();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCards = useMemo(() => ([
    { icon: '📊', name: 'Ad Manager' },
    { icon: '📈', name: 'Marketing Consultant' },
    { icon: '🎯', name: 'Strategic Planner' },
    { icon: '💼', name: 'Business Consultant' },
  ]), []);

  const categoryCounts = useMemo(() => {
    return categoryCards.reduce((acc, card) => {
      acc[card.name] = freelancers.filter((freelancer) => freelancer.category === card.name).length;
      return acc;
    }, {});
  }, [freelancers, categoryCards]);

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

      <main className="freelancers-page">
        <section className="freelancers-hero">
          <div className="container">
            <h1>Expert Freelancers Ready to Help</h1>
            <p>Connect with specialists in your industry and grow your business</p>
          </div>
        </section>

        <div className="freelancers-content">
          <div className="categories-grid" id="categoriesGrid">
            {categoryCards.map((card) => (
              <a href={`/freelancers/${card.name}`} className="category-card" key={card.name}>
                <div className="category-icon">{card.icon}</div>
                <div className="category-name">{card.name}</div>
                <div className="category-count" id={`count-${card.name}`}>{categoryCounts[card.name] || 0} specialists</div>
              </a>
            ))}
          </div>

          <section style={{ marginTop: '60px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#1a1a1a' }}>Featured Specialists</h2>
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <div className="loading-text">Loading specialists...</div>
              </div>
            ) : freelancers.length > 0 ? (
              <div className="freelancers-list" id="freelancersContainer">
                {freelancers.map((freelancer) => (
                  <div className="freelancer-card" key={freelancer.id || `${freelancer.fullName}-${freelancer.email}`}>
                    <div className="freelancer-header">
                      <div>
                        <div className="freelancer-name">{freelancer.fullName}</div>
                        <span className="freelancer-category">{freelancer.category}</span>
                      </div>
                      <div className="rating">
                        {'★'.repeat(Math.floor(freelancer.rating || 0))}{'☆'.repeat(5 - Math.floor(freelancer.rating || 0))}
                        <span>{freelancer.rating || 'New'}</span>
                      </div>
                    </div>
                    <div className="freelancer-bio">{(freelancer.bio || '').substring(0, 150)}...</div>
                    <div className="freelancer-footer">
                      <div className="freelancer-links">
                        {freelancer.portfolioPdfUrl ? (
                          <a href={freelancer.portfolioPdfUrl} target="_blank" rel="noreferrer" className="btn-small secondary" title="View Portfolio">📄 Portfolio</a>
                        ) : null}
                        {freelancer.portfolioLink ? (
                          <a href={freelancer.portfolioLink} target="_blank" rel="noreferrer" className="btn-small secondary">🔗 Website</a>
                        ) : null}
                      </div>
                      <a href={`/client-messages?freelancer=${encodeURIComponent(freelancer.id)}`} className="btn-small primary">💬 Message</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No Specialists Available Yet</div>
                <div className="empty-state-text">Check back soon or register as a freelancer to join our network.</div>
                <a href="/register-freelancer" className="btn primary">Become a Specialist</a>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">© 2025 ShurukerAi — Built for Pakistani entrepreneurs.</div>
      </footer>
    </>
  );
}
