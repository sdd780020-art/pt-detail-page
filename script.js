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
  const lbStage = lightbox.querySelector('.lightbox__stage');
  const lbHint = lightbox.querySelector('.lightbox__hint');
  const lbCap = lightbox.querySelector('.lightbox__cap');
  const lbCount = lightbox.querySelector('.lightbox__count');
  const lbClose = lightbox.querySelector('.lightbox__close');
  const lbPrev = lightbox.querySelector('.lightbox__nav--prev');
  const lbNext = lightbox.querySelector('.lightbox__nav--next');
  let lastFocused = null;
  let group = [];   // 현재 열린 이미지가 속한 갤러리
  let index = 0;

  const zoomables = Array.from(document.querySelectorAll('[data-zoom]'));
  // data-gallery로 묶어두면 같은 갤러리 안에서만 좌우로 넘어갑니다
  const galleries = new Map();
  zoomables.forEach((img) => {
    const key = img.dataset.gallery || null;
    if (!key) return;
    if (!galleries.has(key)) galleries.set(key, []);
    galleries.get(key).push(img);
  });

  const captionOf = (img) => {
    // 갤러리 카드는 이미지 아래 캡션이 따로 있으므로 그걸 우선 사용
    const card = img.closest('.doc, .facility');
    const cap = card && card.querySelector('.doc__cap, .facility__cap');
    return cap ? cap.textContent.trim() : (img.alt || '');
  };

  // 확대용 고해상도본이 있으면 그걸, 없으면 원본 src를 씁니다
  const hiResOf = (img) => img.dataset.zoomSrc || img.getAttribute('src');

  // --- 확대해서 읽기 (데스크탑 전용) ---------------------------------------
  // 설계서는 A4 한 장이라 화면에 맞추면 잔글씨가 안 읽힙니다.
  // 마우스가 있는 환경에선 클릭으로 원본 크기까지 키우고 드래그로 훑어볼 수 있게 합니다.
  // 모바일은 핀치 줌이 이미 되므로 그대로 둡니다.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let zoomed = false;

  const zoomWidth = () => Math.min(lbImg.naturalWidth, Math.max(window.innerWidth * 0.92, 1100));
  // 화면에 맞춘 크기보다 확실히 커질 때만 확대를 제공합니다
  const canZoom = () => finePointer && lbImg.naturalWidth > lbImg.getBoundingClientRect().width + 40;

  const syncHint = () => {
    lightbox.classList.toggle('is-zoomable', !zoomed && canZoom());
    lbHint.textContent = zoomed ? '드래그해서 이동 · 클릭하면 원래 크기'
      : (canZoom() ? '클릭하면 확대됩니다' : '');
  };

  // origin: 확대 기준점(클릭 위치). 그 지점이 화면 중앙에 오도록 스크롤합니다.
  const setZoom = (on, origin) => {
    zoomed = !!on && finePointer;
    lightbox.classList.toggle('is-zoomed', zoomed);
    if (zoomed) {
      lightbox.style.setProperty('--lb-zoom-w', zoomWidth() + 'px');
      const rx = origin ? origin.rx : 0.5;
      const ry = origin ? origin.ry : 0;
      lbStage.scrollLeft = rx * lbStage.scrollWidth - lbStage.clientWidth / 2;
      lbStage.scrollTop = ry * lbStage.scrollHeight - lbStage.clientHeight / 2;
    }
    syncHint();
  };

  const render = () => {
    const img = group[index];
    const target = hiResOf(img);
    setZoom(false);
    // 고해상도본은 용량이 커서 받는 동안 로딩 표시를 둡니다
    lightbox.classList.add('is-loading');
    lbImg.src = target;
    if (lbImg.complete) lightbox.classList.remove('is-loading');
    lbImg.alt = img.alt || '';
    lbCap.textContent = captionOf(img);
    const many = group.length > 1;
    lbCount.textContent = many ? `${index + 1} / ${group.length}` : '';
    lbPrev.hidden = !many;
    lbNext.hidden = !many;
    // 앞뒤 이미지를 미리 받아두면 넘길 때 끊김이 없습니다
    if (many) {
      [-1, 1].forEach((d) => {
        const n = group[(index + d + group.length) % group.length];
        const pre = new Image();
        pre.src = hiResOf(n);
      });
    }
  };

  const step = (d) => {
    if (group.length < 2) return;
    index = (index + d + group.length) % group.length;
    render();
  };

  const openLb = (img) => {
    lastFocused = document.activeElement;
    const key = img.dataset.gallery;
    group = key && galleries.has(key) ? galleries.get(key) : [img];
    index = Math.max(0, group.indexOf(img));
    render();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    syncHint();   // 표시된 뒤라야 실제 크기를 잴 수 있습니다
    lbClose.focus();
  };

  const closeLb = () => {
    setZoom(false);
    lightbox.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  };

  zoomables.forEach((img) => {
    img.addEventListener('click', () => openLb(img));
    // 키보드로도 열 수 있게
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img); }
    });
  });

  lbImg.addEventListener('load', () => { lightbox.classList.remove('is-loading'); syncHint(); });
  lbImg.addEventListener('error', () => lightbox.classList.remove('is-loading'));
  window.addEventListener('resize', () => { if (!lightbox.hidden) setZoom(false); });

  // 이미지를 누르면 확대/축소 — 단, 끌어서 훑은 경우는 제외합니다
  let drag = null;
  let dragMoved = 0;   // 직전 드래그 이동량 — 끌어서 훑은 뒤의 click을 걸러냅니다
  lbImg.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dragMoved > 6) { dragMoved = 0; return; }
    if (zoomed) { setZoom(false); return; }
    if (!canZoom()) return;
    const r = lbImg.getBoundingClientRect();
    setZoom(true, { rx: (e.clientX - r.left) / r.width, ry: (e.clientY - r.top) / r.height });
  });

  lbStage.addEventListener('pointerdown', (e) => {
    dragMoved = 0;   // 새 누름이 시작되면 직전 값은 버립니다
    if (!zoomed || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, l: lbStage.scrollLeft, t: lbStage.scrollTop };
    lightbox.classList.add('is-panning');
    lbStage.setPointerCapture(e.pointerId);
  });
  lbStage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    dragMoved = Math.max(dragMoved, Math.abs(dx) + Math.abs(dy));
    lbStage.scrollLeft = drag.l - dx;
    lbStage.scrollTop = drag.t - dy;
  });
  const endDrag = () => {
    if (!drag) return;
    lightbox.classList.remove('is-panning');
    drag = null;
  };
  lbStage.addEventListener('pointerup', endDrag);
  lbStage.addEventListener('pointercancel', endDrag);

  lbClose.addEventListener('click', closeLb);
  lbPrev.addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
  lbNext.addEventListener('click', (e) => { e.stopPropagation(); step(1); });
  // 이미지 바깥(여백)을 누르면 — 확대 중이면 원래 크기로, 아니면 닫기
  // 드래그 중에는 포인터 캡처 때문에 뗄 때의 click도 여기로 오므로 같이 걸러냅니다
  lightbox.addEventListener('click', (e) => {
    if (e.target !== lightbox && e.target !== lbStage) return;
    if (dragMoved > 6) { dragMoved = 0; return; }
    if (zoomed) setZoom(false); else closeLb();
  });
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') { if (zoomed) setZoom(false); else closeLb(); }
    else if (zoomed) return;   // 확대 중엔 좌우 키를 스크롤에 양보
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  // 모바일 스와이프로도 넘기기
  let touchX = null;
  lightbox.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null || zoomed) { touchX = null; return; }
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });
}

// ============ 트레이너 마퀴 — 자동 흐름 + 직접 스크롤 ============
// 동일 세트를 두 번 이어붙여 두고, 한 세트만큼 지나가면 되감아 무한처럼 보이게 한다.
// 자동 이동은 scrollLeft를 rAF로 증가시켜 만든다. 넘기는 동작(휠·터치 이동·드래그)에만
// 잠시 양보하고, 카드를 누르거나 마우스를 올리는 것으로는 멈추지 않는다.
document.querySelectorAll('.marquee__row').forEach((row) => {
  const track = row.querySelector('.marquee__track');
  if (!track) return;

  // data-dir="rev"인 줄은 반대로 흘러 두 줄이 엇박자를 이룬다.
  // 속도도 살짝 다르게 줘서 같은 위상으로 겹치지 않게.
  const rev = row.dataset.dir === 'rev';
  const SPEED = (rev ? -54.4 : 59.2);  // px/s — 기존(-68/74)의 80%
  const RESUME_DELAY = 1800;       // 손 뗀 뒤 자동 재개까지
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let pos = 0;
  let paused = reduce;
  let resumeTimer = null;
  let prev = null;

  // 세트 하나의 폭 = 전체의 절반 (내용을 2회 반복해 두었으므로)
  const setWidth = () => track.scrollWidth / 2;

  const holdFor = (ms) => {
    paused = true;
    clearTimeout(resumeTimer);
    if (reduce) return;
    resumeTimer = setTimeout(() => { paused = false; }, ms);
  };

  // 넘기는 동작에만 양보한다. 탭은 손가락이 몇 px 흔들려도 touchmove가 발생하므로
  // 이동 거리 임계값을 둬야 '카드를 누르기만 해도 멈추는' 현상이 사라진다.
  const MOVE_THRESHOLD = 8;
  let touchStartX = 0;
  row.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  row.addEventListener('touchmove', (e) => {
    if (Math.abs(e.touches[0].clientX - touchStartX) > MOVE_THRESHOLD) holdFor(RESUME_DELAY);
  }, { passive: true });
  row.addEventListener('wheel', () => holdFor(RESUME_DELAY), { passive: true });

  // 마우스 드래그로도 넘길 수 있게 (데스크탑엔 스와이프가 없음).
  // 누르는 즉시 dragging을 켜면 클릭만 해도 멈추므로, 실제로 움직인 뒤에 켠다.
  let pressing = false, dragging = false, startX = 0, startScroll = 0, moved = 0;
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    pressing = true; moved = 0;
    startX = e.clientX; startScroll = row.scrollLeft;
  });
  row.addEventListener('pointermove', (e) => {
    if (!pressing) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (!dragging && moved > 3) {
      dragging = true;
      row.classList.add('is-dragging');
      try { row.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (dragging) row.scrollLeft = startScroll - dx;
  });
  const endDrag = () => { pressing = false; dragging = false; row.classList.remove('is-dragging'); };
  row.addEventListener('pointerup', endDrag);
  row.addEventListener('pointercancel', endDrag);
  // 드래그였다면 카드 링크가 열리지 않게
  row.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

  // 역방향은 시작 위치를 한 세트 뒤로 두어야 왼쪽으로 되감을 공간이 생긴다
  let initialized = false;
  const tick = (now) => {
    if (prev == null) prev = now;
    if (!initialized) {
      const w0 = setWidth();
      if (w0 > 0) { if (rev) { pos = w0; row.scrollLeft = pos; } initialized = true; }
    }
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
        else if (pos < 0) pos += w;
        row.scrollLeft = pos;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
