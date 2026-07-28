// ============ 스크롤 리빌 ============
const revealTargets = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealTargets.forEach((el) => revealObserver.observe(el));

// ============ 숫자 카운트업 ============
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    const val = Math.floor(eased * target);
    el.textContent = val.toLocaleString('ko-KR') + (p === 1 ? suffix : '');
    if (p < 1) requestAnimationFrame(tick);
    else el.innerHTML = target.toLocaleString('ko-KR') + '<span class="unit">' + suffix + '</span>';
  }
  requestAnimationFrame(tick);
}

const countTargets = document.querySelectorAll('[data-count]');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
countTargets.forEach((el) => countObserver.observe(el));

// ============ 플로팅 CTA ============
// 기본 노출, 히어로가 보이는 첫 화면과 최종 CTA 섹션에서는 숨김(중복 방지)
const floatCta = document.getElementById('floatCta');
const heroSection = document.querySelector('.hero');
const ctaSection = document.getElementById('cta');

if (floatCta) {
  let heroVisible = true;
  let ctaVisible = false;
  const sync = () => floatCta.classList.toggle('is-visible', !heroVisible && !ctaVisible);

  if (heroSection) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { heroVisible = e.isIntersecting; sync(); });
    }, { threshold: 0.35 }).observe(heroSection);
  } else {
    heroVisible = false;
  }

  if (ctaSection) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { ctaVisible = e.isIntersecting; sync(); });
    }, { threshold: 0.25 }).observe(ctaSection);
  }
  sync();
}

// ============ LNB 스크롤 스파이 ============
// 헤더+LNB에 가려진 영역을 제외한 뷰포트 상단 밴드에 들어온 섹션을 활성 처리
const lnbItems = Array.from(document.querySelectorAll('.lnb__item'));
if (lnbItems.length) {
  const targets = lnbItems
    .map((a) => {
      const el = document.querySelector(a.getAttribute('href'));
      return el ? { a, el } : null;
    })
    .filter(Boolean);

  const setActive = (a) => lnbItems.forEach((i) => i.classList.toggle('is-active', i === a));

  const sync = () => {
    const bar = document.querySelector('.lnb');
    const offset = (bar ? bar.getBoundingClientRect().bottom : 110) + 8;
    let current = null;
    targets.forEach(({ a, el }) => {
      const r = el.getBoundingClientRect();
      // 섹션 상단이 기준선 위로 올라갔고, 하단은 아직 기준선 아래 → 현재 섹션
      if (r.top <= offset && r.bottom > offset) current = a;
    });
    // 최하단에서 마지막 항목 고정 (짧은 푸터로 인해 어떤 섹션도 안 걸리는 경우)
    if (!current && window.scrollY + window.innerHeight >= document.body.scrollHeight - 2) {
      current = targets[targets.length - 1].a;
    }
    if (current) setActive(current);
    else lnbItems.forEach((i) => i.classList.remove('is-active'));
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { sync(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  sync();
}

// ============ 모바일 GNB 토글 ============
const gnbToggle = document.querySelector('.gnb__toggle');
const gnb = document.getElementById('gnb');
if (gnbToggle && gnb) {
  const setOpen = (open) => {
    gnb.classList.toggle('is-open', open);
    gnbToggle.setAttribute('aria-expanded', String(open));
    gnbToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  };
  gnbToggle.addEventListener('click', () => {
    setOpen(gnbToggle.getAttribute('aria-expanded') !== 'true');
  });
  // 바깥 클릭·ESC로 닫기
  document.addEventListener('click', (e) => {
    if (!gnb.contains(e.target) && !gnbToggle.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  // 데스크탑으로 넓어지면 인라인 배치로 돌아가므로 상태 초기화
  window.addEventListener('resize', () => { if (window.innerWidth >= 1024) setOpen(false); });
}

// ============ 이미지 확대 (라이트박스) ============
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lbImg = lightbox.querySelector('.lightbox__img');
  const lbCap = lightbox.querySelector('.lightbox__cap');
  const lbClose = lightbox.querySelector('.lightbox__close');
  let lastFocused = null;

  const openLb = (img) => {
    lastFocused = document.activeElement;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt || '';
    // 갤러리 카드는 이미지 아래 캡션이 따로 있으므로 그걸 우선 사용
    const card = img.closest('.doc, .facility');
    const cap = card && card.querySelector('.doc__cap, .facility__cap');
    lbCap.textContent = cap ? cap.textContent.trim() : (img.alt || '');
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  };

  const closeLb = () => {
    lightbox.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  };

  document.querySelectorAll('[data-zoom]').forEach((img) => {
    img.addEventListener('click', () => openLb(img));
    // 키보드로도 열 수 있게
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img); }
    });
  });

  lbClose.addEventListener('click', closeLb);
  // 이미지 자체를 누른 게 아니면 닫기
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLb(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.hidden) closeLb(); });
}

// ============ 트레이너 마퀴 — 자동 흐름 + 직접 스크롤 ============
// 동일 세트를 두 번 이어붙여 두고, 한 세트만큼 지나가면 되감아 무한처럼 보이게 한다.
// 자동 이동은 scrollLeft를 rAF로 증가시켜 만들고, 사용자가 만지면 잠시 멈춘다.
document.querySelectorAll('.marquee__row').forEach((row) => {
  const track = row.querySelector('.marquee__track');
  if (!track) return;

  const SPEED = 37;          // px/s
  const RESUME_DELAY = 1800; // 손 뗀 뒤 자동 재개까지
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let pos = 0;
  let paused = reduce;
  let hovering = false;
  let resumeTimer = null;
  let prev = null;

  // 세트 하나의 폭 = 전체의 절반 (내용을 2회 반복해 두었으므로)
  const setWidth = () => track.scrollWidth / 2;

  const holdFor = (ms) => {
    paused = true;
    clearTimeout(resumeTimer);
    if (reduce) return;
    resumeTimer = setTimeout(() => { if (!hovering) paused = false; }, ms);
  };

  // 사용자가 넘기기 시작하면 자동 이동을 잠시 양보
  ['wheel', 'touchstart', 'pointerdown'].forEach((ev) =>
    row.addEventListener(ev, () => holdFor(RESUME_DELAY), { passive: true })
  );
  row.addEventListener('mouseenter', () => { hovering = true; paused = true; clearTimeout(resumeTimer); });
  row.addEventListener('mouseleave', () => { hovering = false; if (!reduce) holdFor(300); });

  // 마우스 드래그로도 넘길 수 있게 (데스크탑엔 스와이프가 없음)
  let dragging = false, startX = 0, startScroll = 0, moved = 0;
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true; moved = 0;
    startX = e.clientX; startScroll = row.scrollLeft;
    row.classList.add('is-dragging');
    row.setPointerCapture(e.pointerId);
  });
  row.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    row.scrollLeft = startScroll - dx;
  });
  const endDrag = () => { dragging = false; row.classList.remove('is-dragging'); };
  row.addEventListener('pointerup', endDrag);
  row.addEventListener('pointercancel', endDrag);
  // 드래그였다면 카드 링크가 열리지 않게
  row.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  const tick = (now) => {
    if (prev == null) prev = now;
    const dt = Math.min((now - prev) / 1000, 0.05); // 탭 복귀 시 급점프 방지
    prev = now;

    const w = setWidth();
    if (w > 0) {
      if (paused || dragging) {
        pos = row.scrollLeft;
        // 사용자가 끝까지 밀었으면 되감아 계속 넘길 수 있게
        if (pos >= w) { pos -= w; row.scrollLeft = pos; }
        else if (pos <= 0) { pos += w; row.scrollLeft = pos; }
      } else {
        pos += SPEED * dt;
        if (pos >= w) pos -= w;
        row.scrollLeft = pos;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
