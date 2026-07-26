# 실버 테이블 (Silver Tables) 가이드

> 최종 업데이트: 2026-01-15 KST
> 버핏서울 전사 표준 데이터 테이블

## 개요

실버 테이블은 버핏서울 전사에서 **모든 구성원이 동일한 기준**으로 데이터를 조회할 수 있도록 만든 표준화된 뷰(View)입니다.

### 특징
- **업데이트 주기**: 1시간 단위
- **컬럼명**: 한글 (비즈니스 가독성 우선)
- **공통 키**: `user_id` (모든 테이블 조인 기준)
- **CRM 쿼리**: 이 테이블들을 우선 사용하여 깔끔한 쿼리 작성

---

## 테이블 목록

| 테이블명 | 설명 | 건수 | 주요 용도 |
|---------|------|------|----------|
| `raw_data_user` | 회원 마스터 | 82,526 | 회원 기본정보 |
| `raw_data_mbs` | 이용권(멤버십) | 203,894 | 상품 구매 이력 |
| `raw_data_pt` | PT 현황 | 22,078 | PT 회원 관리 |
| `raw_data_reservation` | 예약 | 589,210 | 예약/출석 관리 |
| `raw_data_revenue` | 매출 | 322,436 | 매출 분석 |
| `raw_data_attendance` | 출석 | 2,342,754 | 출석 이력 |
| `raw_data_activeuser` | 활성회원 | 2,213 | 월별 활성회원 집계 |

---

## 1. raw_data_user (회원)

### 컬럼 구조
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `user_id` | bigint | 회원 고유 ID (PK) |
| `이름` | varchar | 회원 이름 |
| `닉네임` | varchar | 닉네임 |
| `연락처` | varchar | 전화번호 |
| `이메일` | varchar | 이메일 |
| `성별` | varchar | 성별 |
| `생년월일` | date | 생년월일 |
| `만나이` | int | 현재 나이 |
| `프로필이미지` | varchar | 프로필 이미지 URL |
| `주소` | varchar | 주소 |
| `마케팅동의` | boolean | 마케팅 수신 동의 |
| `가입일` | date | 회원 가입일 |

### CRM 활용 예시
```sql
-- 가입 후 N일 경과 회원
SELECT user_id, "이름", "연락처", "가입일"
FROM raw_data_user
WHERE "가입일" = CURRENT_DATE - INTERVAL '3 days'
  AND "마케팅동의" = true;
```

---

## 2. raw_data_mbs (이용권/멤버십)

### 컬럼 구조 (35개)
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `user_id` | bigint | 회원 ID (FK) |
| `mbs_id` | bigint | 멤버십 고유 ID |
| `tx_id` | bigint | 트랜잭션 ID |
| `txlog_id` | bigint | 트랜잭션 로그 ID |
| `지점명` | varchar | 지점명 |
| `회원명` | varchar | 회원 이름 |
| `연락처` | text | 전화번호 |
| `성별` | varchar | 성별 |
| `만나이` | int | 나이 |
| `환불` | text | 환불 여부 |
| `결제일` | date | 결제일 |
| `시작일` | date | 이용 시작일 |
| `종료일` | date | 이용 종료일 |
| `카테고리` | varchar | **상품 카테고리** |
| `상품명` | varchar | 상품명 |
| `가격` | int | 결제 금액 |
| `체험정규` | text | **체험/정규 구분** |
| `회차_lifetime` | int | 전체 이용 회차 |
| `회차_category` | int | 카테고리별 회차 |
| `신재휴체` | text | 신규/재등록/휴면/체험 구분 |
| `전당익미` | text | 전환/당일/익일/미전환 구분 |

### 카테고리 분포
| 카테고리 | 건수 | 매출(억원) |
|---------|------|-----------|
| 피트니스 | 107,260 | 140.7 |
| 팀버핏 | 32,879 | 36.0 |
| **PT** | **19,708** | **162.9** |
| 골프 | 9,148 | 52.9 |
| 필라테스 | 8,149 | 60.0 |

### 체험/정규 구분 (PT)
| 구분 | 건수 | 비율 |
|-----|------|------|
| PT 정규 | 15,017 | 76.2% |
| PT 체험 | 4,691 | 23.8% |

### CRM 활용 예시
```sql
-- PT 미구매 회원 (피트니스만 구매)
SELECT DISTINCT m.user_id, m."회원명", m."연락처"
FROM raw_data_mbs m
WHERE m."카테고리" = '피트니스'
  AND m."환불" IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM raw_data_mbs pt
      WHERE pt.user_id = m.user_id
        AND pt."카테고리" = 'PT'
  );

-- PT 체험권 구매자 (정규 전환 대상)
SELECT user_id, "회원명", "연락처", "결제일", "상품명"
FROM raw_data_mbs
WHERE "카테고리" = 'PT'
  AND "체험정규" = 'PT 체험'
  AND "환불" IS NULL;
```

---

## 3. raw_data_pt (PT 현황)

### 컬럼 구조 (22개)
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `user_id` | bigint | 회원 ID |
| `membership_id` | bigint | 멤버십 ID |
| `place_id` | bigint | 지점 ID |
| `trainer_user_id` | bigint | 담당 트레이너 ID |
| `지점명` | varchar | 지점명 |
| `회원이름` | varchar | 회원 이름 |
| `회원연락처` | varchar | 전화번호 |
| `멤버십명` | varchar | PT 상품명 |
| `멤버십시작일` | date | PT 시작일 |
| `멤버십종료일` | date | PT 종료일 |
| `체험여부` | text | **체험권/정규권** |
| `환불여부` | text | 환불 상태 |
| `담당트레이너` | varchar | 트레이너 이름 |
| `총횟수` | bigint | 총 PT 횟수 |
| `사용횟수` | bigint | 사용한 횟수 |
| `잔여횟수` | bigint | 남은 횟수 |
| `다음예약_날짜` | date | 다음 예약일 |
| `다음예약_시간` | text | 다음 예약 시간 |
| `체험1회_날짜` | date | 체험 1회차 날짜 |
| `체험1회_시간` | text | 체험 1회차 시간 |
| `체험2회_날짜` | date | 체험 2회차 날짜 |
| `체험2회_시간` | text | 체험 2회차 시간 |

### 체험/정규 분포
| 구분 | 건수 | 비율 |
|-----|------|------|
| 정규권 | 13,704 | 62.1% |
| 체험권 | 8,374 | 37.9% |

### 지점별 PT 현황 (TOP 5)
| 지점 | 건수 |
|-----|------|
| 신도림 | 4,429 |
| 도곡 | 4,411 |
| 판교 | 2,905 |
| 역삼 | 2,652 |
| 논현 | 1,985 |

### CRM 활용 예시
```sql
-- PT 체험권 사용 중인 회원 (전환 타겟)
SELECT user_id, "회원이름", "회원연락처", "담당트레이너",
       "총횟수", "사용횟수", "잔여횟수"
FROM raw_data_pt
WHERE "체험여부" = '체험권'
  AND "환불여부" IS NULL
  AND "잔여횟수" > 0;

-- PT 예약이 없는 회원 (리마인드 대상)
SELECT user_id, "회원이름", "회원연락처", "담당트레이너"
FROM raw_data_pt
WHERE "환불여부" IS NULL
  AND "잔여횟수" > 0
  AND "다음예약_날짜" IS NULL;
```

---

## 4. raw_data_reservation (예약)

### 컬럼 구조 (26개)
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `res_id` | bigint | 예약 ID |
| `user_id` | bigint | 회원 ID |
| `membership_id` | bigint | 멤버십 ID |
| `place_id` | bigint | 지점 ID |
| `trainer_user_id` | text | 트레이너 ID |
| `지점명` | text | 지점명 |
| `회원이름` | text | 회원 이름 |
| `회원연락처` | text | 전화번호 |
| `수업날짜` | date | 예약 날짜 |
| `시작시간` | text | 시작 시간 |
| `수업명` | text | 수업명 |
| `트레이너` | text | 트레이너 이름 |
| `프로그램명` | text | **프로그램 종류** |
| `예약확정` | text | 확정/미확정 |
| `예약취소` | text | 유지/취소 |
| `출석여부` | text | 출석/미출석 |
| `트레이너확정` | text | 트레이너 확정 여부 |
| `유저확정` | text | 유저 확정 여부 |
| `당일취소` | text | 당일 취소 여부 |
| `멤버십명` | text | 멤버십 상품명 |
| `체험정규` | text | **체험/정규** |
| `총횟수` | bigint | 총 횟수 |
| `사용횟수` | bigint | 사용 횟수 |
| `잔여횟수` | bigint | 잔여 횟수 |
| `멤버십시작일` | date | 멤버십 시작일 |
| `멤버십종료일` | date | 멤버십 종료일 |

### 예약 상태 분포
| 상태 | 건수 | 비율 |
|-----|------|------|
| 확정 + 출석 | 429,161 | 72.8% |
| 취소 | 142,443 | 24.2% |
| 확정 + 미출석 | 17,519 | 3.0% |

### 프로그램별 예약 (TOP 5)
| 프로그램 | 건수 |
|---------|------|
| PT | 201,919 |
| 그룹 필라테스 | 142,302 |
| 스페셜 클래스 | 53,734 |
| 7:1 필라테스 | 36,245 |
| 6:1 필라테스 | 34,250 |

### CRM 활용 예시
```sql
-- PT 체험 예약 후 출석한 회원
SELECT DISTINCT user_id, "회원이름", "회원연락처"
FROM raw_data_reservation
WHERE "프로그램명" = 'PT'
  AND "체험정규" = '체험'
  AND "출석여부" = '출석';

-- 예약 취소율이 높은 회원
SELECT user_id, "회원이름",
       COUNT(*) as total_res,
       SUM(CASE WHEN "예약취소" = '취소' THEN 1 ELSE 0 END) as cancel_cnt,
       ROUND(SUM(CASE WHEN "예약취소" = '취소' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as cancel_rate
FROM raw_data_reservation
GROUP BY user_id, "회원이름"
HAVING COUNT(*) >= 5
ORDER BY cancel_rate DESC;
```

---

## 5. raw_data_revenue (매출)

### 컬럼 구조 (20개)
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `user_id` | bigint | 회원 ID |
| `tx_id` | bigint | 트랜잭션 ID |
| `txlog_id` | bigint | 트랜잭션 로그 ID |
| `mbs_id` | bigint | 멤버십 ID |
| `환불양도_연결txlog` | bigint | 환불/양도 연결 로그 |
| `지점명` | varchar | 지점명 |
| `회원명` | varchar | 회원 이름 |
| `연락처` | text | 전화번호 |
| `매출구분` | text | **정규/옵션/기타/환불/F&B** |
| `결제일` | date | 결제일 |
| `시작일` | date | 시작일 |
| `종료일` | date | 종료일 |
| `카테고리` | varchar | 상품 카테고리 |
| `상품명` | varchar | 상품명 |
| `가격` | int | 금액 |
| `결제채널` | text | 결제 채널 |
| `결제수단` | varchar | 결제 수단 |
| `온오프라인` | text | 온라인/오프라인 |
| `제공업체` | varchar | 제공업체 |
| `결제담당자` | varchar | 담당자 |

### 매출구분별 현황
| 구분 | 건수 | 금액(억원) |
|-----|------|-----------|
| 정규 | 121,860 | 512.1 |
| 기타 | 32,563 | 28.2 |
| 옵션 | 61,817 | 23.2 |
| 환불 | 33,116 | 3.2 |
| F&B | 73,080 | 1.3 |

### 정규 매출 카테고리별
| 카테고리 | 건수 | 금액(억원) |
|---------|------|-----------|
| **PT** | **18,847** | **155.1** |
| 피트니스 | 57,544 | 132.9 |
| 팀버핏 | 27,164 | 108.0 |
| 필라테스 | 7,178 | 56.0 |
| 골프 | 8,111 | 49.4 |

### CRM 활용 예시
```sql
-- PT 결제 회원 (정규 매출)
SELECT user_id, "회원명", "연락처", "결제일", "상품명", "가격"
FROM raw_data_revenue
WHERE "매출구분" = '정규'
  AND "카테고리" = 'PT'
ORDER BY "결제일" DESC;

-- 최근 30일 PT 매출 현황
SELECT "지점명", COUNT(*) as cnt, SUM("가격") as total
FROM raw_data_revenue
WHERE "매출구분" = '정규'
  AND "카테고리" = 'PT'
  AND "결제일" >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY "지점명"
ORDER BY total DESC;
```

---

## 6. raw_data_attendance (출석)

### 컬럼 구조 (10개)
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `checkin_id` | bigint | 체크인 ID |
| `user_id` | bigint | 회원 ID |
| `mbs_id` | bigint | 멤버십 ID |
| `datetime` | timestamp | 출석 일시 |
| `place_name` | varchar | 지점명 |
| `user_name` | varchar | 회원 이름 |
| `phone_number` | text | 전화번호 |
| `mbs_category` | varchar | 멤버십 카테고리 |
| `mbs_trial_type` | text | 체험/정규 구분 |
| `mbs_title` | varchar | 멤버십명 |

### CRM 활용 예시
```sql
-- 최근 7일 내 출석한 회원
SELECT DISTINCT user_id, user_name, phone_number
FROM raw_data_attendance
WHERE datetime >= CURRENT_DATE - INTERVAL '7 days';

-- 피트니스 이용 중이나 출석 없는 회원 (리텐션 타겟)
SELECT m.user_id, m."회원명", m."연락처"
FROM raw_data_mbs m
WHERE m."카테고리" = '피트니스'
  AND m."환불" IS NULL
  AND m."종료일" >= CURRENT_DATE
  AND NOT EXISTS (
      SELECT 1 FROM raw_data_attendance a
      WHERE a.user_id = m.user_id
        AND a.datetime >= CURRENT_DATE - INTERVAL '14 days'
  );
```

---

## 7. raw_data_activeuser (활성회원)

### 컬럼 구조 (5개)
| 컬럼명 | 타입 | 설명 |
|-------|------|------|
| `month` | text | 월 (YYYY-MM) |
| `first_day` | date | 월 첫날 |
| `place` | varchar | 지점명 |
| `category` | text | 카테고리 |
| `user_count` | bigint | 활성회원 수 |

### 카테고리별 활성회원 (누적)
| 카테고리 | 명수 |
|---------|------|
| 전체 | 358,591 |
| F/P/T | 299,725 |
| 피트니스 | 204,872 |
| 팀버핏 | 60,372 |
| PT | 44,094 |
| 필라테스 | 32,813 |

### 월별 활성회원 추이 (최근 6개월)
| 월 | 활성회원 |
|----|---------|
| 2026-01 | 64,066 |
| 2025-12 | 63,572 |
| 2025-11 | 58,457 |
| 2025-10 | 56,977 |
| 2025-09 | 52,982 |
| 2025-08 | 48,007 |

---

## 테이블 관계도 (ERD)

```
┌─────────────────┐
│  raw_data_user  │──────────────────────────────────────────────────┐
│  (회원 마스터)   │                                                   │
│  PK: user_id    │                                                   │
└────────┬────────┘                                                   │
         │                                                            │
         │ user_id                                                    │
         ▼                                                            │
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐│
│  raw_data_mbs   │      │  raw_data_pt    │      │raw_data_revenue ││
│  (이용권)        │      │  (PT 현황)       │      │  (매출)          ││
│  FK: user_id    │      │  FK: user_id    │      │  FK: user_id    ││
│  FK: mbs_id     │◀────▶│  FK: membership │◀────▶│  FK: mbs_id     ││
│  FK: tx_id      │      │      _id        │      │  FK: tx_id      ││
└────────┬────────┘      └────────┬────────┘      └─────────────────┘│
         │                        │                                   │
         │ user_id                │ user_id                          │
         ▼                        ▼                                   │
┌─────────────────┐      ┌─────────────────┐                         │
│raw_data_attend  │      │raw_data_reserv  │                         │
│   ance (출석)    │      │   ation (예약)   │                         │
│  FK: user_id    │◀────▶│  FK: user_id    │                         │
│  FK: mbs_id     │      │  FK: membership │                         │
└─────────────────┘      │      _id        │                         │
                         └─────────────────┘                         │
                                                                      │
┌─────────────────┐                                                   │
│raw_data_active  │ (집계 테이블 - 직접 조인 없음)                       │
│   user          │                                                   │
└─────────────────┘                                                   │
```

---

## CRM 세그먼트 쿼리 예시

### 1. PT 미구매 + 피트니스 구매 + 출석 O (가입 후 3일)

```sql
-- 가입 후 3일, 피트니스 구매 O, 출석 O, PT 미구매
SELECT
    u.user_id,
    u."이름",
    u."연락처",
    u."가입일",
    m."지점명"
FROM raw_data_user u
-- 피트니스 구매 확인
JOIN raw_data_mbs m ON u.user_id = m.user_id
    AND m."카테고리" = '피트니스'
    AND m."환불" IS NULL
-- 출석 확인 (최근 7일)
WHERE EXISTS (
    SELECT 1 FROM raw_data_attendance a
    WHERE a.user_id = u.user_id
      AND a.datetime >= CURRENT_DATE - INTERVAL '7 days'
)
-- PT 미구매 확인
AND NOT EXISTS (
    SELECT 1 FROM raw_data_mbs pt
    WHERE pt.user_id = u.user_id
      AND pt."카테고리" = 'PT'
)
-- 가입 후 3일
AND u."가입일" = CURRENT_DATE - INTERVAL '3 days'
AND u."마케팅동의" = true;
```

### 2. PT 체험권 구매 → 정규 미전환

```sql
-- PT 체험권 사용 후 정규 미전환 (전환 유도 대상)
SELECT
    pt.user_id,
    pt."회원이름",
    pt."회원연락처",
    pt."담당트레이너",
    pt."사용횟수",
    pt."멤버십종료일"
FROM raw_data_pt pt
WHERE pt."체험여부" = '체험권'
  AND pt."환불여부" IS NULL
  AND pt."사용횟수" >= 1  -- 1회 이상 사용
  AND NOT EXISTS (
      SELECT 1 FROM raw_data_pt regular
      WHERE regular.user_id = pt.user_id
        AND regular."체험여부" = '정규권'
        AND regular."멤버십시작일" > pt."멤버십시작일"
  );
```

### 3. 출석 X + 피트니스 이용 중

```sql
-- 피트니스 이용 중이나 최근 14일 출석 없음 (리텐션 대상)
SELECT
    m.user_id,
    m."회원명",
    m."연락처",
    m."지점명",
    m."종료일"
FROM raw_data_mbs m
WHERE m."카테고리" = '피트니스'
  AND m."환불" IS NULL
  AND m."종료일" >= CURRENT_DATE
  AND NOT EXISTS (
      SELECT 1 FROM raw_data_attendance a
      WHERE a.user_id = m.user_id
        AND a.datetime >= CURRENT_DATE - INTERVAL '14 days'
  );
```

---

## 주의사항

1. **업데이트 지연**: 실버 테이블은 1시간 단위 업데이트 → 실시간 데이터가 필요하면 원본 테이블 사용
2. **NULL 처리**: 환불/취소 여부는 NULL이 정상 상태인 경우가 많음
3. **중복 주의**: `raw_data_mbs`는 회원당 여러 건 존재 → `DISTINCT` 사용 필요
4. **시간대**: 모든 timestamp는 KST 기준
5. **조인 키**: 모든 테이블은 `user_id`로 조인 가능

---

## 빠른 참조

### 핵심 조건 (PT CRM용)

| 조건 | 테이블 | 컬럼 | 값 |
|-----|-------|------|---|
| PT 구매 | raw_data_mbs | 카테고리 | 'PT' |
| PT 체험 | raw_data_mbs | 체험정규 | 'PT 체험' |
| PT 정규 | raw_data_mbs | 체험정규 | 'PT 정규' |
| 환불 안 함 | raw_data_mbs | 환불 | IS NULL |
| 피트니스 구매 | raw_data_mbs | 카테고리 | '피트니스' |
| 출석 있음 | raw_data_attendance | datetime | >= 기준일 |
| 마케팅 동의 | raw_data_user | 마케팅동의 | true |
| 가입 후 N일 | raw_data_user | 가입일 | = CURRENT_DATE - N |

---

*이 문서는 CRM 세그먼트 쿼리 작성 시 참조용입니다.*
*최종 업데이트: 2026-01-15 KST*
