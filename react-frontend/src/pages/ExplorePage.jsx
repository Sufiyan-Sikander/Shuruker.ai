import { useEffect } from 'react';
import Chart from 'chart.js/auto';
import { loadScript } from '../loadScript';
import { flaskBaseUrl } from '../authConfig';

export default function ExplorePage() {
  useEffect(() => {
    document.body.classList.add('explore-page');
    window.Chart = Chart;

    let cancelled = false;

    const boot = async () => {
      await loadScript('/static/js/explore.js?v=1');
      if (!cancelled && typeof window.exploreInit === 'function') {
        await window.exploreInit();
      }
    };

    boot().catch((error) => console.error(error));

    return () => {
      cancelled = true;
      document.body.classList.remove('explore-page');
    };
  }, []);

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
            <a href="/explore" aria-current="page">Explore</a>
            <a href="/learn">Learn</a>
            <a className="signin" href="/login">Sign In</a>
            <a className="signup" href="/start">Sign Up</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="explore-hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">Pakistan Market Pulse</div>
              <h1>Explore trending businesses and city-by-city momentum</h1>
              <p className="lead">See where demand is rising, slice by city, and get a quick probability check for your idea before you invest.</p>
              <div className="hero-meta">
                <span className="chip">Updated weekly</span>
                <span className="chip ghost">City-level signals</span>
                <span className="chip ghost">Category trend lines</span>
              </div>
              <div className="hero-cta">
                <a className="btn primary" href="/login?next=/chat">Chat about my idea</a>
                <a className="btn ghost" href="#probability">Check probability</a>
              </div>
            </div>
            <div className="hero-panel">
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <p className="small-label">Fast view</p>
                    <h3>Top movers this week</h3>
                  </div>
                  <span className="pill pill-green">Live</span>
                </div>
                <div className="panel-list" id="topMovers"></div>
                <div className="panel-foot">
                  <span className="muted">Signals from marketplace search, registrations, and delivery volume proxies.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="explore-section">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="small-label">City slicer</p>
                <h2>Trend lines by city and category</h2>
              </div>
              <div className="filters">
                <label htmlFor="citySelect" className="input-label">City</label>
                <select id="citySelect">
                  <option value="all">All Pakistan</option>
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Multan">Multan</option>
                </select>
              </div>
            </div>

            <div className="explore-grid">
              <div className="card chart-card">
                <div className="card-head">
                  <div>
                    <p className="small-label">Momentum</p>
                    <h3>Monthly trend score</h3>
                  </div>
                  <div className="pill pill-amber" id="cityPulse">Pakistan view</div>
                </div>
                <canvas id="trendChart" aria-label="Trend chart" role="img"></canvas>
                <div className="chart-legend" id="legend"></div>
              </div>

              <div className="card insights">
                <div className="card-head">
                  <p className="small-label">Highlights</p>
                  <h3>What this means</h3>
                </div>
                <div className="insight-list" id="insightList"></div>
              </div>
            </div>
          </div>
        </section>

        <section id="probability" className="explore-section probability">
          <div className="container probability-grid">
            <div>
              <p className="small-label">Fast probability check</p>
              <h2>See if your business fits the city</h2>
              <p className="lead">A lightweight scoring helper using city demand, category heat, and basics like budget. Use it as a directional guide, not a guarantee.</p>
              <div className="pill pill-ghost">Human judgment still required</div>
            </div>
            <div className="card probability-card">
              <form id="probabilityForm" className="probability-form">
                <label className="input-label" htmlFor="ideaInput">Business idea</label>
                <input id="ideaInput" type="text" placeholder="e.g., Cloud kitchen for desi bowls" required />

                <label className="input-label" htmlFor="categorySelect">Business type</label>
                <select id="categorySelect">
                  <option value="Cloud Kitchen">Cloud Kitchen</option>
                  <option value="Boutique Fashion">Boutique Fashion</option>
                  <option value="EdTech Bootcamp">EdTech Bootcamp</option>
                  <option value="Used Cars">Used Cars</option>
                  <option value="Pharmacy Delivery">Pharmacy Delivery</option>
                  <option value="Home Bakery">Home Bakery</option>
                  <option value="Other">Other</option>
                </select>

                <label className="input-label" htmlFor="probCitySelect">City</label>
                <select id="probCitySelect">
                  <option value="Karachi">Karachi</option>
                  <option value="Lahore">Lahore</option>
                  <option value="Islamabad">Islamabad</option>
                  <option value="Rawalpindi">Rawalpindi</option>
                  <option value="Faisalabad">Faisalabad</option>
                  <option value="Multan">Multan</option>
                </select>

                <label className="input-label" htmlFor="budgetSelect">Budget runway</label>
                <select id="budgetSelect">
                  <option value="low">Under PKR 1.5M</option>
                  <option value="mid">PKR 1.5M – 4M</option>
                  <option value="high">Above PKR 4M</option>
                </select>

                <label className="input-label">Advantages</label>
                <div className="checkbox-group">
                  <label><input type="checkbox" value="experience" defaultChecked /> You have relevant experience</label>
                  <label><input type="checkbox" value="location" /> You already have a location/lease</label>
                  <label><input type="checkbox" value="audience" /> You have an online audience</label>
                </div>

                <button type="submit" className="btn primary full">Calculate probability</button>
              </form>
              <div className="probability-result" id="probabilityResult">
                <div className="score" id="score">--%</div>
                <div className="score-label" id="scoreLabel">Awaiting input</div>
                <p className="muted" id="scoreNote">We will use the trend signals above plus your inputs.</p>
                <div className="recommendations" id="recommendations"></div>
              </div>
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
