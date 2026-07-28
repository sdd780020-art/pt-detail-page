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
