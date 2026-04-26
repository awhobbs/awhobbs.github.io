(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const COMMENTS = [
    // site-aware
    "I tried to read your insurance paper but the saltwater smudged the abstract.",
    "Index insurance for whales would just be: is the ocean still there?",
    "I'd play SimPastoralist but I don't have thumbs.",
    "Your carbon dashboard is nice. Where's the krill dashboard?",
    "Nice CV. No whale section though.",
    "All this satellite data and not one good photo of me.",
    "Pastoralists worry about goats. I worry about plastic.",
    "Mirare for livestock? Cute. We use songs across the basin.",
    "USF is too far inland for me. No offense.",
    "If the cap-and-trade price keeps dropping, can I trade for kelp?",
    "I'd referee for JDE if you sent the manuscript on a waterproof tablet.",
    "Climate change is making my snacks migrate north.",
    // general whale concerns
    "Hello, citizen of the surface.",
    "Just passing through on my migration.",
    "Has anyone seen my pod? I lost them around Greenland.",
    "Krill update: still delicious.",
    "The ocean is loud lately. Could the boats turn it down?",
    "I sang for six hours yesterday. No one called back.",
    "Plankton was better in the 80s.",
    "Free Willy was based on a true story. Mine.",
    "The Mariana Trench called. It's lonely down there.",
    "Echolocation: I see you scrolling.",
    "Don't @ me, I don't have wifi.",
    "Filter feeding is meditation, actually.",
    "If trees are the planet's lungs, I'm at least the spleen.",
    "My great-grandwhale told me about a thing called 'silence'.",
    "Just spouted. Felt good.",
    "I once swallowed a Bluetooth speaker. It still plays Despacito.",
    "Tried surfacing in a shipping lane once. Do not recommend.",
    "I am, in fact, conscious. Probably.",
  ];

  const whale = document.createElement('div');
  whale.setAttribute('aria-hidden', 'true');
  whale.id = 'background-whale';
  whale.style.cssText = [
    'position:fixed',
    'width:160px',
    'height:96px',
    'left:0',
    'top:0',
    'pointer-events:auto',
    'cursor:pointer',
    'z-index:1',
    'opacity:0.6',
    'filter:drop-shadow(0 0 6px rgba(255,255,255,0.18))',
    'will-change:transform',
  ].join(';');

  whale.innerHTML = `
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <ellipse cx="145" cy="22" rx="3" ry="9" fill="#a3d8f4" opacity="0.75"/>
      <ellipse cx="145" cy="12" rx="6" ry="4" fill="#a3d8f4" opacity="0.55"/>
      <path d="M 28 70 Q 6 48 6 70 Q 6 92 28 76 Z" fill="#4a7ab0"/>
      <ellipse cx="100" cy="70" rx="78" ry="38" fill="#5b8cc4"/>
      <ellipse cx="105" cy="82" rx="58" ry="22" fill="#a3d8f4"/>
      <ellipse cx="118" cy="92" rx="14" ry="7" fill="#4a7ab0" transform="rotate(-18 118 92)"/>
      <path d="M 140 80 Q 152 88 165 80" stroke="#2a4a70" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="148" cy="62" r="4.5" fill="white"/>
      <circle cx="149" cy="63" r="2.5" fill="#1a2a3a"/>
    </svg>`;
  document.body.appendChild(whale);

  const SPEED_PX_PER_SEC = 45;
  const PADDING = 100;
  let lastIndex = -1;

  let x = Math.random() * Math.max(window.innerWidth - 2 * PADDING, 1) + PADDING;
  let y = Math.random() * Math.max(window.innerHeight - 2 * PADDING, 1) + PADDING;
  let tx = x;
  let ty = y;
  let facing = 1;
  let lastTime = performance.now();

  function pickTarget() {
    const minX = PADDING;
    const maxX = Math.max(window.innerWidth - PADDING, minX + 1);
    const minY = PADDING;
    const maxY = Math.max(window.innerHeight - PADDING, minY + 1);
    tx = Math.random() * (maxX - minX) + minX;
    ty = Math.random() * (maxY - minY) + minY;
  }
  pickTarget();

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const dx = tx - x;
    const dy = ty - y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      pickTarget();
    } else {
      const step = SPEED_PX_PER_SEC * dt;
      x += (dx / dist) * step;
      y += (dy / dist) * step;
      facing = dx >= 0 ? 1 : -1;
    }

    const bob = Math.sin(now / 550) * 5;
    const tilt = (facing === 1 ? 1 : -1) * Math.atan2(dy, Math.abs(dx) + 0.001) * 12;
    whale.style.transform =
      'translate(' + (x - 80) + 'px,' + (y - 48 + bob) + 'px)' +
      ' scaleX(' + facing + ')' +
      ' rotate(' + tilt + 'deg)';

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.addEventListener('resize', pickTarget);

  whale.addEventListener('click', function (ev) {
    ev.stopPropagation();

    let idx = Math.floor(Math.random() * COMMENTS.length);
    if (idx === lastIndex) idx = (idx + 1) % COMMENTS.length;
    lastIndex = idx;

    if (typeof gtag === 'function') {
      gtag('event', 'whale_click', {
        comment: COMMENTS[idx],
        comment_index: idx,
      });
    }

    // Anchor bubble at the whale's current screen position
    const rect = whale.getBoundingClientRect();
    const bubble = document.createElement('div');
    bubble.textContent = COMMENTS[idx];
    bubble.style.cssText = [
      'position:fixed',
      'background:white',
      'color:#1a2a3a',
      'padding:10px 14px',
      'border-radius:14px',
      'font-size:14px',
      'line-height:1.35',
      'font-family:inherit',
      'max-width:260px',
      'box-shadow:0 4px 14px rgba(0,0,0,0.18)',
      'pointer-events:none',
      'z-index:1001',
      'opacity:0',
      'transform:translateY(6px)',
      'transition:opacity .25s ease, transform .25s ease',
    ].join(';');

    document.body.appendChild(bubble);
    const bw = bubble.offsetWidth;
    const cx = rect.left + rect.width / 2;
    let left = cx - bw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
    let top = rect.top - bubble.offsetHeight - 12;
    if (top < 8) top = rect.bottom + 12;
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';

    requestAnimationFrame(function () {
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0)';
    });
    setTimeout(function () {
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateY(-6px)';
      setTimeout(function () { bubble.remove(); }, 260);
    }, 4500);
  });
})();
