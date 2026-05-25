import React from 'react';
import { flaskBaseUrl } from '../authConfig';

export default function StartPage(){
  return (
    <div>
      <header className="nav scrolled">
        <div className="container nav-inner">
          <div className="brand">
            <div className="logo"><img src="/static/images/logo2.png" alt="logo"/></div>
            <div className="brand-text"><span className="brand-name">ShurukerAi</span></div>
          </div>
        </div>
      </header>

      <main>
        <section className="info" style={{padding:'80px 0'}}>
          <div className="container">
            <div className="card" style={{padding:24}}>
              <h2>Welcome to ShurukerAi!</h2>
              <p>Ready to launch your business idea? Let's get started with your AI-powered business assistant.</p>
              <div style={{marginTop:16,display:'flex',gap:8,flexDirection:'column',maxWidth:420}}>
                <a className="btn primary" href={`${flaskBaseUrl}/login?next=/chat`} style={{textAlign:'center',textDecoration:'none'}}>Start Chatting Now</a>
                <a className="btn ghost" href={`${flaskBaseUrl}/`} style={{textAlign:'center',textDecoration:'none'}}>Back to Home</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
