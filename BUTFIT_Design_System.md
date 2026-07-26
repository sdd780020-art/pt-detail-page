# BUTFIT Design System
> 버핏서울 BG-APP-WEB 3.0 / 다크 모드 디폴트 / 브랜드: 버핏그라운드·팀버핏·버핏플레이

---

## 1. 컬러

### 1.1 메인
| 이름 | HEX | 용도 |
|------|-----|------|
| **BUTFIT GREEN** | `#00D857` | Primary, CTA, 강조 |
| **BUTFIT BLACK** | `#0D0D0E` | 메인 배경 |
| **BUTFIT WHITE** | `#FFFFFF` | 보조 배경, 텍스트 |

### 1.2 다크 모드 토큰 (디폴트)
```
배경:   #0D0D0E (메인) / #1C1C20 (서피스 카드) / #131315 (깊은 배경)
보더:   #23232A
텍스트: #FFFFFF (주) / #A4A7B0 (보조) / #737885 (캡션) / #42424D (비활성)
강조:   #00D857
```

### 1.3 라이트 모드 토큰
```
배경: #FFFFFF / #F8F9FB (서피스) / #E9EBED (보더)
텍스트: #0D0D0E / #737885 / #A4A7B0
강조: #00D857
```

### 1.4 그린 변형
| 이름 | HEX | 용도 |
|------|-----|------|
| Green Light | `#00C850` | 밝은 강조 |
| Green Vivid | `#00FF47` | 글로우 |
| Green Dark | `#137931` | 딥 그린 |
| Green Glow Alpha | `rgba(7,233,70,0.7)` | 그림자/글로우 |

### 1.5 사용 원칙
- 온라인: HEX `#00D857` 기준 / 오프라인: CMYK `C80 M0 Y90 K0`
- 사이니지/공간: PANTONE 별도 (디자이너 문의)
- BUTFIT GREEN을 다른 그린으로 임의 대체 금지

---

## 2. 타이포그래피

### 2.1 한글 — Pretendard (필수)
| 웨이트 | 값 | 용도 |
|--------|-----|------|
| Regular 400 | 본문 |
| Medium 500 | UI 레이블 |
| SemiBold 600 | 서브 헤딩, 버튼 |
| Bold 700 | 헤딩 |
| ExtraBold 800 | 대형 타이틀 |
| Black 900 | 히어로, 임팩트 |

### 2.2 폰트 스케일
| 레벨 | 크기 | 웨이트 |
|------|------|--------|
| Display | 80px | ExtraBold |
| Hero | 50px | ExtraBold |
| H1 | 35–40px | Black |
| H2 | 30px | Bold |
| H3 | 25px | SemiBold |
| Body L | 17px | Medium |
| Body M | 15px | Medium |
| Body S | 13px | Regular |
| Caption | 12px | Regular |
| Micro | 10px | Medium |

### 2.3 공통 스타일
- letterSpacing: `-0.24px` 기본 / `-0.4px` 대형 헤딩
- lineHeight: `1.1` 헤딩 / `1.55~1.65` 본문

### 2.4 영문 — Hudson NY (라이선스 필요)
- 헤딩/사이니지 전용 (본문 사용 금지)
- **라이선스 미확보 시 Pretendard로 대체**

### 2.5 보조 폰트
- Noto Sans KR (Bold) — 일부 버튼 / Inter — 숫자·영문 수치 / Winner-Bold — 특수 헤딩

---

## 3. 레이아웃

### 3.1 모바일 (기준)
| 항목 | 값 |
|------|-----|
| 기준 너비 | 375px (iPhone) |
| 좌우 여백 | 16~20px |
| 콘텐츠 최대 | 343px |
| Status Bar / Safe Area | 44px / 34px |

### 3.2 웹 (PC)
| 항목 | 값 |
|------|-----|
| 기준 너비 | 1440px |
| 헤더 높이 | 60px |
| 콘텐츠 너비 | 980px |

### 3.3 간격 토큰
| xs 4 | sm 8 | md 12 | base 16 | lg 20 | xl 24 | 2xl 32 | 3xl 40 |

### 3.4 모서리 반경
| sm 4 | md 10 | lg 15 | xl 20 | 2xl 25 | pill 27~999 |

---

## 4. 컴포넌트

### 4.1 버튼
| 상태 | 배경 | 텍스트 |
|------|------|--------|
| Active | `#00D857` | `#FFFFFF` |
| Inactive (라이트) | `#E9EBED` | `#A4A7B0` |
| Inactive (다크) | `#23232A` | `#42424D` |

- 사이즈 예: 230×50 (pill 27px) / 106×42 (사각 10px)
- 텍스트: Pretendard Bold 15px, letterSpacing `-0.24px`

### 4.2 카드
- 다크: 배경 `#1C1C20`, 보더 `#23232A` / 라이트: `#FFFFFF`, 보더 `#E9EBED`
- borderRadius 15~20px

### 4.3 바텀시트/모달
- 핸들: 36×4px pill `rgba(255,255,255,0.2)`
- 상단 모서리: 24px

### 4.4 태그
- Square: radius 4px, 패딩 4×8, 10~12px Medium
- Pill: radius 999px, 반투명 그린 또는 다크 서피스

### 4.5 인디케이터/탭
- 활성 `#00D857` / 비활성 `#737885` (라이트) `#23232A` (다크)

### 4.6 앱 아이콘
- 100×100, radius 25px, 배경 `#00D857`, 다크 로고타입

---

## 5. 로고

| 종류 | 배경 |
|------|------|
| 화이트 로고 | 다크 배경 (`#0D0D0E`, `#1C1C20`) |
| 블랙 로고 | 라이트 배경 (`#FFFFFF`) |
| 그린 BG 로고 | `#00D857` |

- 브랜드: 버핏그라운드(횡형) / 팀버핏(횡형) / 버핏서울(법인)
- 변형·왜곡·그림자·그라디언트 적용 금지
- AI 파일은 디자이너 요청

---

## 6. 아이콘
- 패밀리 `_Glyphs / Icon` (v4.0+), 기본 16/24/26/30px
- 컬러: 활성 `#FFFFFF` 또는 `#00D857` / 비활성 `#737885`
- 주요: close, more, heart-line, menu, arrow-up, save, refresh, big arrow-right
- 3D: rental-line, Sauna, parking, Plate, clap, smile, joy, good

---

## 7. 플랫폼별 적용
| 플랫폼 | 주 폰트 | 보조 | 컬러 모드 |
|--------|---------|------|-----------|
| 모바일 앱 | Pretendard | Noto Sans KR | 다크 우선 |
| 웹 (PC) | Pretendard | Hudson NY | 다크 우선 |
| 콘텐츠/SNS | Pretendard | Hudson NY | 혼용 |
| 사이니지 | Hudson NY | Pretendard | — |

---

## 8. 금지 사항
- 로고 변형·왜곡·그림자·그라디언트
- BUTFIT GREEN 임의 대체
- Hudson NY 라이선스 없이 사용
- 사이니지에 Pretendard 단독 사용 (Hudson NY 병용 필수)

---
*요약본 (481 → 160 라인) / BG-APP-WEB 3.0 UI KIT 기준*
