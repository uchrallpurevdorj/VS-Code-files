/* =========================================
   MASSINO'S PIZZERIA — main.js
   ========================================= */

(function () {
  'use strict';

  /* ---- Custom Cursor ---- */
  const cursor = document.getElementById('cursor');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
    const hoverTargets = 'a, button, [role="button"], .deal-card, .menu-item-card, .review-card';
    document.querySelectorAll(hoverTargets).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
  }

  /* ---- Ticker duplication ---- */
  const track = document.querySelector('.ticker-track');
  if (track) {
    const clone = track.cloneNode(true);
    track.parentNode.appendChild(clone);
  }

  /* ---- Navigation scroll behavior ---- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Active nav link ---- */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPage = href.split('/').pop();
    if (
      linkPage === page ||
      (page === '' && linkPage === 'index.html') ||
      (page === 'index.html' && href === '#') ||
      (linkPage && page.includes(linkPage.replace('.html', '')))
    ) {
      link.classList.add('active');
    }
  });

  /* ---- Hamburger / mobile drawer ---- */
  const hamburger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.nav-drawer');
  if (hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      drawer.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---- Scroll Reveal (IntersectionObserver) ---- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ---- Hero parallax ---- */
  const heroLeft = document.querySelector('.hero-left');
  const pizzaVisual = document.querySelector('.pizza-visual');
  if (heroLeft || pizzaVisual) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        const factor = y * 0.2;
        if (heroLeft) heroLeft.style.transform = `translateY(${factor * 0.4}px)`;
        if (pizzaVisual) pizzaVisual.style.transform = `translateY(${factor * 0.25}px)`;
      }
    }, { passive: true });
  }

  /* ---- Category tabs (home menu preview) ---- */
  const homeTabBtns = document.querySelectorAll('.home-tabs .tab-btn');
  const homeTabContents = document.querySelectorAll('.home-tab-content');

  if (homeTabBtns.length > 0) {
    homeTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        homeTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        homeTabContents.forEach(c => {
          c.classList.toggle('active', c.dataset.tabContent === target);
        });
      });
    });
    if (homeTabBtns[0]) homeTabBtns[0].click();
  }

  /* ---- Category tabs (full menu page) ---- */
  const menuTabBtns = document.querySelectorAll('.menu-tabs .tab-btn');
  const menuSections = document.querySelectorAll('.menu-category-section');

  if (menuTabBtns.length > 0) {
    const activateTab = (btn) => {
      menuTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      menuSections.forEach(section => {
        section.classList.toggle('active', section.dataset.category === target);
      });
    };

    menuTabBtns.forEach(btn => btn.addEventListener('click', () => activateTab(btn)));

    // Check URL hash on load
    const hash = window.location.hash.replace('#', '');
    const matchingBtn = hash
      ? Array.from(menuTabBtns).find(b => b.dataset.tab === hash)
      : menuTabBtns[0];
    if (matchingBtn) activateTab(matchingBtn);
  }

  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- Open Now badge ---- */
  const openBadge = document.querySelector('.hero-tag');
  if (openBadge) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = hours * 60 + minutes;
    const open = 11 * 60;  // 11:00 AM
    const close = 20 * 60 + 30; // 8:30 PM
    const isOpen = time >= open && time < close;

    const dot = openBadge.querySelector('.hero-tag-dot');
    const text = openBadge.querySelector('.hero-tag-text');

    if (!isOpen && dot && text) {
      dot.style.background = '#e74c3c';
      dot.style.animation = 'none';
      text.textContent = 'Opens 11:00 AM';
      text.style.color = '#e74c3c';
      openBadge.style.borderColor = 'rgba(231,76,60,0.4)';
      openBadge.style.background = 'rgba(231,76,60,0.1)';
    }
  }

  /* ---- Staggered hero load animation ---- */
  const heroEls = document.querySelectorAll('.hero-animate');
  heroEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    setTimeout(() => {
      el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 200 + i * 200);
  });

  /* ---- Cursor on dynamically-added elements ---- */
  if (cursor) {
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, [role="button"]')) {
        cursor.classList.add('hovering');
      } else {
        cursor.classList.remove('hovering');
      }
    });
  }

})();
