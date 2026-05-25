import { useEffect } from 'react';
import { loadScript } from '../loadScript';
import { flaskBaseUrl } from '../authConfig';

export default function FreelancerInboxPage() {
  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await loadScript('/static/js/direct_messages.js');
      if (!cancelled && typeof window.directMessagesInit === 'function') {
        window.directMessagesInit();
      }
    };

    boot().catch((error) => console.error(error));
    return () => {
      cancelled = true;
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
            <a href="/freelancer-inbox">Freelancer Inbox</a>
            <a href="/freelancers">Find Freelancer</a>
            <a className="signup" href={`${flaskBaseUrl}/logout`}>Logout</a>
          </nav>
        </div>
      </header>

      <main className="dm-shell" data-dm-role="freelancer">
        <div className="dm-grid">
          <section className="dm-panel">
            <div className="panel-head"><h2>Client Conversations</h2></div>
            <div id="threads" className="threads"></div>
          </section>
          <section className="dm-panel chat">
            <div className="panel-head">
              <h2 id="chatTitle">Select a client chat</h2>
              <div id="chatSub" className="chat-sub">Inbox for approved freelancers</div>
            </div>
            <div id="messages" className="msgs"><div className="empty">No conversation selected yet.</div></div>
            <form id="composer" className="composer" style={{ display: 'none' }}>
              <input id="messageInput" type="text" maxLength={2000} placeholder="Type your reply..." autoComplete="off" />
              <button type="submit">Send</button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
