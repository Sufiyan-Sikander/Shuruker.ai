import { useEffect, useMemo, useState } from 'react';
import AuthPage from './AuthPage';
import { flaskBaseUrl } from './authConfig';
import StartPage from './pages/StartPage';
import ChatPage from './pages/ChatPage';
import ExplorePage from './pages/ExplorePage';
import ClientMessagesPage from './pages/ClientMessagesPage';
import FreelancerInboxPage from './pages/FreelancerInboxPage';
import FreelancersPage from './pages/FreelancersPage';
import FreelancerLoginPage from './pages/FreelancerLoginPage';
import RegisterFreelancerPage from './pages/RegisterFreelancerPage';
import FreelancersCategoryPage from './pages/FreelancersCategoryPage';
import LearnPage from './pages/LearnPage';
import AdminPage from './pages/AdminPage';

function App() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = window.location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleHashLinks = (event) => {
      const target = event.target.closest('a[href^="#"]');
      if (!target) return;
      const hash = target.getAttribute('href');
      if (!hash || hash === '#') return;
      const element = document.querySelector(hash);
      if (!element) return;
      event.preventDefault();
      const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
      const targetPosition = element.getBoundingClientRect().top + window.scrollY - navHeight - 12;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      window.history.pushState(null, '', hash);
    };

    document.addEventListener('click', handleHashLinks);
    return () => document.removeEventListener('click', handleHashLinks);
  }, []);

  const featureCards = useMemo(() => ([
    {
      title: 'Market Analysis',
      text: 'Pakistan-specific market research, competitor benchmarks, and pricing insights to validate opportunities.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#g1)" />
          <defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Idea Validation',
      text: 'Quickly assess whether your idea has demand, identify unique angles, and reduce risk before you invest.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="9" r="4" fill="url(#g2)" />
          <path d="M11 14h2v2h-2z" fill="#fff" opacity=".9" />
          <defs><linearGradient id="g2" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Business Strategy',
      text: 'Actionable business models, pricing and positioning to make your idea competitive and scalable.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 13h6v6H4zM14 4h6v6h-6z" fill="url(#g3)" />
          <defs><linearGradient id="g3" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Target Audience',
      text: 'Define customer segments, preferences, and channels to reach them effectively in Pakistan.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 12a3 3 0 100-6 3 3 0 000 6zM4 20a8 8 0 0116 0H4z" fill="url(#g4)" />
          <defs><linearGradient id="g4" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Growth Roadmap',
      text: 'A 30-day rollout plan with weekly milestones, KPIs, and quick wins to gain traction fast.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M4 20h16" stroke="url(#g5)" strokeWidth="2" strokeLinecap="round" />
          <defs><linearGradient id="g5" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Marketing Insights',
      text: 'Channel suggestions, messaging, and low-cost growth tactics tailored for your audience.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3 12h3l4 6 5-10 6 6" stroke="url(#g6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <defs><linearGradient id="g6" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Startup Planning',
      text: 'Budget estimates, legal steps, and operations checklists to get your company set up correctly.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" fill="url(#g7)" />
          <defs><linearGradient id="g7" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: 'Actionable Recommendations',
      text: 'Clear next steps and templates you can immediately use to move from idea to execution.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M5 12h14" stroke="url(#g8)" strokeWidth="2" strokeLinecap="round" />
          <defs><linearGradient id="g8" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
    {
      title: '24/7 Available',
      text: 'Ask questions whenever you need and receive clear, prioritized steps whenever for any business need.',
      icon: (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="url(#g9)" strokeWidth="1.4" />
          <path d="M12 7v6l4 2" stroke="url(#g9)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <defs><linearGradient id="g9" x1="0" x2="1"><stop offset="0" stopColor="#7b61ff" /><stop offset="1" stopColor="#ff6a5b" /></linearGradient></defs>
        </svg>
      ),
    },
  ]), []);

  const useCases = [
    ['Clothing & Fashion', 'Get pricing strategy, supplier planning, and launch ideas for boutiques and apparel brands.'],
    ['Food & Cafes', 'Plan menus, estimate startup costs, and build local marketing steps for restaurants and cafes.'],
    ['Service Businesses', 'Create offers, define target clients, and map practical growth actions for service providers.'],
    ['Online Stores', 'Validate products, select sales channels, and design a simple go-to-market roadmap for e-commerce.'],
    ['Home-Based Startups', 'Build low-budget launch plans, prioritize essentials, and reduce risk before expanding operations.'],
    ['Local Retail', 'Improve positioning, footfall strategy, and customer retention for neighborhood stores.'],
  ];

  const loginUrl = `/login?next=/chat`;

  if (pathname === '/login') {
    return <AuthPage mode="login" />;
  }

  if (pathname === '/freelancer-login') {
    return <FreelancerLoginPage />;
  }

  if (pathname === '/start') {
    return <StartPage />;
  }

  if (pathname === '/chat') {
    return <ChatPage />;
  }

  if (pathname === '/explore') {
    return <ExplorePage />;
  }

  if (pathname === '/learn') {
    return <LearnPage />;
  }

  if (pathname === '/admin') {
    return <AdminPage />;
  }

  if (pathname === '/client-messages') {
    return <ClientMessagesPage />;
  }

  if (pathname === '/freelancer-inbox') {
    return <FreelancerInboxPage />;
  }

  if (pathname === '/freelancers') {
    return <FreelancersPage />;
  }

  if (pathname === '/register-freelancer') {
    return <RegisterFreelancerPage />;
  }

  if (pathname.startsWith('/freelancers/')) {
    return <FreelancersCategoryPage />;
  }

  return (
    <>
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <a className="brand" href="/" aria-label="ShurukerAi home">
            <div className="logo"><img src="/static/images/logo2.png" alt="ShurukerAi logo" /></div>
            <div className="brand-text">
              <span className="brand-name">ShurukerAi</span>
              <small className="brand-slogan">Pakistan's Smart Business Launch Partner</small>
            </div>
          </a>

          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#solution">Solution</a>
            <a href="/explore">Explore</a>
            <div className="nav-dropdown">
              <a href="#services" className="dropdown-toggle">Services</a>
              <div className="dropdown-menu">
                <a href="/register-freelancer">Register as Freelancer</a>
                <a href="/freelancer-login">Login as Freelancer</a>
                <a href="/freelancers">Find Freelancer</a>
              </div>
            </div>
            <a className="signin" href="/login">Sign In</a>
            <a className="signup" href="/start">Sign Up</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy">
              <h1>Work Smarter With Every Chat</h1>
              <p className="lead">Our AI assistant helps you validate ideas, build launch-ready business plans, and get practical step-by-step guidance-24/7.</p>

              <div className="hero-cta">
                <a className="btn primary" href={loginUrl}>Get Started Free</a>
                <a className="btn ghost" href="/learn" target="_blank" rel="noopener noreferrer">Learn More</a>
              </div>

              <ul className="features-list">
                <li>Idea Validation</li>
                <li>Market Research (Pakistan-focused)</li>
                <li>30-day Launch Roadmap</li>
              </ul>
            </div>

            <div className="hero-preview">
              <div className="card">
                <div className="card-header">
                  <div className="avatar">S</div>
                  <div className="user">Shuruker</div>
                </div>
                <div className="card-body">
                  <div className="mock-chat">
                    <div className="bubble user">Hi, I want to start a clothing store in Lahore. Help me plan it.</div>
                    <div className="bubble bot">Great! Let's walk through target customers, startup budget and a 30-day roadmap.</div>
                    <div className="bubble user">How do I estimate costs?</div>
                  </div>
                </div>
                <div className="card-footer">
                  <input placeholder="Ask anything-e.g., 'Launch plan for a cafe'" aria-label="Ask anything" />
                  <button className="mini">Ask</button>
                </div>
              </div>
            </div>
          </div>

          <svg className="hero-decor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#7b61ff" />
                <stop offset="50%" stopColor="#ff6a5b" />
                <stop offset="100%" stopColor="#ffc857" />
              </linearGradient>
            </defs>
            <rect width="800" height="400" fill="url(#g)" opacity="0.08" rx="30" />
          </svg>
        </section>

        <section id="features" className="info">
          <div className="container">
            <h2>What ShurukerAi can do for you</h2>
            <div className="grid">
              {featureCards.slice(0, 3).map((card) => (
                <div className="info-card" key={card.title}>
                  <div className="card-inner">
                    <div className="icon">{card.icon}</div>
                    <div className="meta">{card.title}</div>
                    <div className="desc">{card.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid">
              {featureCards.slice(3, 6).map((card) => (
                <div className="info-card" key={card.title}>
                  <div className="card-inner">
                    <div className="icon">{card.icon}</div>
                    <div className="meta">{card.title}</div>
                    <div className="desc">{card.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid">
              {featureCards.slice(6).map((card) => (
                <div className="info-card" key={card.title}>
                  <div className="card-inner">
                    <div className="icon">{card.icon}</div>
                    <div className="meta">{card.title}</div>
                    <div className="desc">{card.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solution" className="use-cases">
          <div className="container">
            <h2>Use Cases by Industry</h2>
            <p className="use-cases-lead">See how ShurukerAi helps different businesses plan smarter and launch faster.</p>
            <div className="use-cases-grid">
              {useCases.map(([title, text]) => (
                <article className="use-case-card" key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="services-highlight">
          <div className="container services-highlight-inner">
            <div>
              <h3>Freelancer Services</h3>
              <p>Need expert execution support? Connect with specialists or join as a freelancer.</p>
            </div>
            <div className="services-actions">
              <a className="btn ghost" href="/freelancers">Find Freelancer</a>
              <a className="btn primary" href="/register-freelancer">Register as Freelancer</a>
            </div>
          </div>
        </section>

        <section id="start" className="cta-band">
          <div className="container cta-inner">
            <div>
              <h3>Ready to launch your idea?</h3>
              <p>Get a tailored 30-day plan and budget with a single chat.</p>
            </div>
            <div>
              <a className="btn primary large" href={loginUrl}>Get Started</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">© 2025 ShurukerAi — Built for Pakistani entrepreneurs.</div>
      </footer>
    </>
  );
}

export default App;