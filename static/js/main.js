function initMainPage(){
  const btns = document.querySelectorAll('.btn');
  btns.forEach(b=>b.addEventListener('click', ()=>{
    // simple click pulse effect
    b.animate([{transform:'scale(1)'},{transform:'scale(0.98)'},{transform:'scale(1)'}],{duration:220})
  }))

  // Navbar scroll effect: add .scrolled when page is scrolled down
  const nav = document.querySelector('.nav');
  const SCROLL_THRESHOLD = 0; // apply on any non-zero scroll

  function onScroll(){
    const body = document.body;
    if(!nav || !body) return;
    if(window.scrollY > SCROLL_THRESHOLD){
      nav.classList.add('scrolled');
      body.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
      body.classList.remove('scrolled');
    }
  }

  // Smooth scroll for in-page anchors with offset (account for sticky header)
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  function scrollToTargetElement(target){
    if(!target) return;
    const navHeight = nav ? nav.offsetHeight : 0;
    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
  }

  anchorLinks.forEach(a=>{
    a.addEventListener('click', function(e){
      // only handle same-page anchors
      if(a.hash && document.querySelector(a.hash)){
        // stop default jump
        e.preventDefault();
        const target = document.querySelector(a.hash);
        scrollToTargetElement(target);
        // update URL without jumping
        history.pushState(null, '', a.hash);
      }
    });
  });

  // If page loaded with a hash, scroll to it with offset
  if(location.hash){
    const initialTarget = document.querySelector(location.hash);
    if(initialTarget){
      setTimeout(()=> scrollToTargetElement(initialTarget), 90);
    }
  }

  // initial check and bind
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});

  // Intersection observer for .learn page animated reveals
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        // add small delay for hero underline
        if(entry.target.classList && entry.target.classList.contains('hero-title')){
          const underline = entry.target.querySelector('.gradient-underline');
          if(underline) underline.style.transform = 'scaleX(1)';
        }
      }
    })
  },{threshold:0.14});

  document.querySelectorAll('[data-animate]').forEach(el=>observer.observe(el));
  const heroTitle = document.querySelector('.hero-title'); if(heroTitle) observer.observe(heroTitle);

  // Parallax effect for the Learn page background image
  const learnBg = document.querySelector('.learn-bg-img');
  if(learnBg){
    let latestScroll = 0;
    let ticking = false;

    function updateParallax(){
      // disable on small screens
      if(window.innerWidth < 900){
        learnBg.style.transform = 'translateZ(0) translateY(0)';
        return;
      }

      const rect = learnBg.getBoundingClientRect();
      const winH = window.innerHeight;
      // center-based offset - the farther from center, the larger the translate
      const offsetFromCenter = (rect.top + rect.height/2) - winH/2;
      // sensitivity factor for subtle effect
      const translateY = Math.round(-offsetFromCenter * 0.06);
      learnBg.style.transform = `translateZ(0) translateY(${translateY}px)`;
      ticking = false;
    }

    function onScrollParallax(){
      latestScroll = window.scrollY;
      if(!ticking){
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }

    // initial position
    updateParallax();
    window.addEventListener('scroll', onScrollParallax, {passive:true});
    window.addEventListener('resize', updateParallax);
  }

  // Attempt autoplay fallback for the learn page video (muted to satisfy autoplay policies)
  const learnVideo = document.querySelector('.learn-video video');
  if(learnVideo){
    try{
      learnVideo.muted = true;
      // Some browsers require a short delay to allow media to be ready
      setTimeout(()=>{
        const playPromise = learnVideo.play();
        if(playPromise && playPromise.catch){
          playPromise.catch(()=>{
            // Autoplay was prevented; user interaction will be required
          });
        }
      }, 200);
    }catch(e){/* ignore */}
  }
}

window.shurukerMainInit = initMainPage;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainPage, { once: true });
} else {
  initMainPage();
}