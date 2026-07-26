# PT CRM 데이터베이스 스키마 문서

> 최종 업데이트: 2026-01-15 KST
> DB: PostgreSQL 17.4 (AWS RDS Replica)
> 총 테이블: 270개 | 총 회원: 82,527명

---

## ⭐ 권장: 실버 테이블 우선 사용

**CRM 세그먼트 쿼리 작성 시 `raw_data_*` 실버 테이블을 우선 사용하세요!**

실버 테이블은 전사 표준화된 뷰로, 한글 컬럼명과 정제된 데이터를 제공합니다.

| 실버 테이블 | 원본 테이블 | 용도 |
|------------|------------|------|
| `raw_data_user` | user_user | 회원 기본정보 |
| `raw_data_mbs` | b_class_bmembership | 이용권/결제 |
| `raw_data_pt` | b_class_bpersonaltraining | PT 현황 |
| `raw_data_reservation` | b_class_bsessionreservation | 예약 |
| `raw_data_attendance` | b_checkin_bcheckinlog | 출석 |
| `raw_data_revenue` | b_payment_* | 매출 |

**→ 상세 가이드: [SILVER_TABLES.md](./SILVER_TABLES.md)**

---

## 1. 핵심 테이블 관계도 (원본 테이블)

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│   user_user     │──────│ b_payment_btransaction│──────│  b_class_bmembership │
│   (회원)        │      │      (거래)          │      │     (이용권)        │
└─────────────────┘      └──────────────────────┘      └─────────────────────┘
        │                          │                            │
        │                          │                            │
        ▼                          ▼                            ▼
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│b_checkin_bcheckinlog│  │  b_payment_border    │      │b_class_bpersonaltraining│
│    (체크인)     │      │      (주문)          │      │       (PT)          │
└─────────────────┘      └──────────────────────┘      └─────────────────────┘
        │                                                       │
        │                                                       │
        ▼                                                       ▼
┌─────────────────┐                                   ┌─────────────────────┐
│b_class_bsessionreservation│                         │   user_btrainer     │
│   (세션예약)    │                                   │     (트레이너)      │
└─────────────────┘                                   └─────────────────────┘
```

---

## 2. 회원 테이블 (user_user)

**총 회원 수: 82,527명**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| phone_number | varchar | NO | 전화번호 (로그인 ID) |
| name | varchar | NO | 이름 |
| email | varchar | YES | 이메일 |
| gender | varchar | YES | 성별 (m/f) |
| birth_date | date | YES | 생년월일 |
| date_joined | timestamptz | YES | **가입일시 (KST)** |
| last_login | timestamptz | YES | 마지막 로그인 |
| is_active | boolean | NO | 활성 상태 |
| route | varchar | NO | **가입 경로** |
| allowed_for_marketing | boolean | NO | 마케팅 수신 동의 |
| address | text | YES | 주소 |
| address_info | jsonb | YES | 주소 상세 (JSON) |

### 가입 경로(route) 분포
| 경로 | 설명 | 회원 수 |
|------|------|---------|
| u_app | 유저앱 | 31,714명 |
| bf_web | 버핏서울 웹 | 22,222명 |
| p_manager | 매니저 등록 | 10,864명 |
| bg_web | 버핏그라운드 웹 | 10,022명 |
| bf_play | 버핏플레이 | 3,201명 |
| tb_u_app | 팀버핏 유저앱 | 1,309명 |
| u_app_ft | 유저앱(FT) | 1,108명 |
| referral | 추천 | 1,005명 |

---

## 3. 이용권 테이블 (b_class_bmembership)

**총 이용권 수: 303,619개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| begin_date | date | NO | 시작일 |
| end_date | date | NO | 종료일 |
| is_active | boolean | NO | 활성 상태 |
| **is_gym** | boolean | NO | **피트니스 이용권 여부** |
| **is_trial** | boolean | NO | **체험권 여부** |
| is_morning | boolean | YES | 모닝 이용권 |
| is_benefit | boolean | NO | 혜택 이용권 |
| title | varchar | YES | 이용권 이름 |
| transaction_id | integer | YES | **거래 ID (FK → user_id 연결)** |
| transaction_log_id | integer | YES | 거래 로그 ID |
| b_pass_id | bigint | YES | 이용권 타입 ID |
| coach_id | bigint | YES | 담당 코치 ID |
| created | timestamptz | NO | 생성일시 |

### 이용권 타입 분포 (활성 기준)
| is_gym | is_trial | 건수 | 설명 |
|--------|----------|------|------|
| True | False | 21,933개 | 피트니스 이용권 |
| False | False | 8,182개 | PT/기타 이용권 |
| False | True | 545개 | PT 체험권 |
| True | True | 4개 | 피트니스 체험권 |

### 회원-이용권 연결 쿼리
```sql
-- 회원의 이용권 조회 (transaction을 통해 연결)
SELECT
    u.id as user_id,
    u.name,
    m.id as membership_id,
    m.is_gym,
    m.is_trial,
    m.begin_date,
    m.end_date
FROM user_user u
JOIN b_payment_btransaction t ON t.user_id = u.id
JOIN b_class_bmembership m ON m.transaction_id = t.id
WHERE u.id = {user_id};
```

---

## 4. 거래 테이블 (b_payment_btransaction)

**총 거래 수: 661,401개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| **user_id** | bigint | YES | **회원 ID (FK)** |
| order_id | bigint | YES | 주문 ID |
| merchant_uid | varchar | NO | 상점 UID |
| pg_uid | varchar | NO | PG사 UID |
| final_price | integer | NO | 최종 결제금액 |
| pay_method | varchar | YES | 결제수단 |
| pay_date | date | YES | 결제일 |
| is_refund | boolean | NO | 환불 여부 |
| is_transfer | boolean | NO | 양도 여부 |
| order_status | varchar | NO | 주문 상태 |
| created | timestamptz | NO | 생성일시 |

### 주문 상태(order_status) 분포
| 상태 | 건수 |
|------|------|
| PICKED_UP | 349,445개 |
| (빈값) | 307,852개 |
| READY | 2,839개 |
| ORDER_RECEIVED | 1,017개 |

### 환불 분포
- 정상 거래: 645,183개
- 환불 거래: 16,218개

---

## 5. 주문 테이블 (b_payment_border)

**총 주문 수: 686,359개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| user_id | bigint | YES | 회원 ID |
| b_place_id | integer | NO | 지점 ID |
| total_price | integer | NO | 총 금액 |
| pay_method | varchar | YES | 결제수단 |
| store_type | varchar | NO | **주문 채널** |
| b_product_info | jsonb | NO | 상품 정보 (JSON) |
| begin_date | date | YES | 시작일 |
| created | timestamptz | NO | 생성일시 |

### 주문 채널(store_type) 분포
| 채널 | 건수 | 설명 |
|------|------|------|
| app | 377,693개 | 앱 주문 |
| on_site | 230,613개 | 현장 주문 |
| web | 47,180개 | 웹 주문 |
| kiosk | 30,875개 | 키오스크 |

---

## 6. 체크인 테이블 (b_checkin_bcheckinlog)

**총 체크인 수: 2,890,056개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| **user_id** | bigint | YES | **회원 ID** |
| b_place_id | integer | YES | 지점 ID |
| b_membership_id | integer | YES | 이용권 ID |
| **is_succeed** | boolean | NO | **체크인 성공 여부** |
| code | varchar | YES | 체크인 코드 |
| code_type | varchar | YES | 코드 타입 |
| created | timestamptz | NO | **체크인 일시 (출석 시간)** |

### 출석 확인 쿼리
```sql
-- 특정 회원의 최근 출석 기록
SELECT
    user_id,
    b_place_id,
    created as checkin_time
FROM b_checkin_bcheckinlog
WHERE user_id = {user_id}
  AND is_succeed = true
ORDER BY created DESC;
```

---

## 7. PT 이용권 테이블 (b_class_bpersonaltraining)

**총 PT 이용권: 18,324개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| b_membership_id | bigint | NO | **이용권 ID (FK)** |
| b_trainer_id | bigint | NO | 트레이너 ID |
| status | varchar | NO | **PT 상태** |
| ended | timestamptz | YES | 종료일시 |
| created | timestamptz | NO | 생성일시 |

### PT 상태(status) 분포
| 상태 | 건수 |
|------|------|
| ACTIVE | 15,208개 |
| INACTIVE | 3,116개 |

### PT 이용권-회원 연결 쿼리
```sql
-- PT 이용권을 가진 회원 조회
SELECT
    u.id as user_id,
    u.name,
    pt.id as pt_id,
    pt.status,
    pt.b_trainer_id,
    m.begin_date,
    m.end_date
FROM b_class_bpersonaltraining pt
JOIN b_class_bmembership m ON pt.b_membership_id = m.id
JOIN b_payment_btransaction t ON m.transaction_id = t.id
JOIN user_user u ON t.user_id = u.id
WHERE pt.status = 'ACTIVE';
```

---

## 8. 지점 테이블 (b_class_bplace)

**총 지점: 22개 (활성: 14개)**

| ID | 지점명 | 활성 |
|----|--------|------|
| 1 | 역삼 | O |
| 2 | 도곡 | O |
| 16 | 신도림 | O |
| 17 | 논현 | O |
| 18 | 판교 | O |
| 19 | 강변 | O |
| 20 | 가산 | O |
| 21 | 삼성 | O |
| 22 | 광화문 | O |
| 24 | 한티 | O |
| 25 | 마곡 | O |
| 26 | 판교벤처타운 | O |
| 27 | 역삼GFC | O |
| 28 | 합정 | O |

---

## 9. 세션 예약 테이블 (b_class_bsessionreservation)

**총 세션예약: 1,426,850개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| user_pk | integer | YES | 회원 PK |
| b_session_pk | integer | NO | 세션 PK |
| b_membership_pk | integer | NO | 이용권 PK |
| b_trainer_pk | integer | YES | 트레이너 PK |
| b_place_pk | integer | YES | 지점 PK |
| b_session_date | date | YES | 세션 날짜 |
| **is_confirmed** | boolean | NO | **예약 확정** |
| **is_canceled** | boolean | NO | **예약 취소** |
| is_check_in | boolean | YES | 체크인 여부 |
| created | timestamptz | NO | 생성일시 |

### 예약 상태 분포
| is_confirmed | is_canceled | 건수 |
|--------------|-------------|------|
| True | False | 1,021,364개 (정상) |
| False | True | 405,492개 (취소) |

---

## 10. PT 상담 예약 테이블 (b_consulting_ptconsultingreservation)

**총 상담예약: 350개**

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| user_id | bigint | NO | 회원 ID |
| pt_trainer_id | bigint | YES | 트레이너 ID |
| place_id | bigint | NO | 지점 ID |
| **status** | varchar | NO | **상담 상태** |
| reservation_date | date | NO | 예약 날짜 |
| reservation_time | time | NO | 예약 시간 |
| source | varchar | YES | 예약 경로 |
| workout_concerns | jsonb | NO | 운동 고민 |
| created | timestamptz | NO | 생성일시 |

### 상담 상태(status) 분포
| 상태 | 건수 |
|------|------|
| canceled | 207개 |
| confirmed | 143개 |

---

## 11. 상품 아이템 테이블 (b_payment_bproductitem)

| 컬럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | bigint | NO | PK |
| description | text | NO | 상품명/설명 |
| price | integer | YES | 가격 |
| use_days | smallint | NO | 사용 기간 |
| b_place_id | bigint | NO | 지점 ID |
| **is_trial** | boolean | NO | **체험 상품 여부** |
| main_program_id | bigint | YES | 메인 프로그램 ID |
| category_id | bigint | YES | 카테고리 ID |

### PT 상품 예시
| ID | 상품명 | 가격 | 기간 |
|----|--------|------|------|
| 1492 | PT Only N회권 | 5,000,000원 | 90일 |
| 1252 | PT 30회(145일) | 1,797,000원 | 145일 |
| 855 | PT 10회(2개월) 체험 | 699,000원 | 60일 |
| 1140 | 첫구매 PT 20회(3개월) 체험 | 1,480,000원 | 90일 |

---

## 12. 핵심 세그먼트 쿼리 예시

### 가입 후 N일 경과 회원
```sql
-- 가입 후 3일 경과한 회원
SELECT id, name, phone_number, date_joined
FROM user_user
WHERE date_joined BETWEEN
    CURRENT_DATE - INTERVAL '4 days'
    AND CURRENT_DATE - INTERVAL '3 days'
  AND is_active = true;
```

### 피트니스 이용권 보유 회원
```sql
-- 피트니스 이용권(is_gym=true) 활성 보유 회원
SELECT DISTINCT t.user_id
FROM b_class_bmembership m
JOIN b_payment_btransaction t ON m.transaction_id = t.id
WHERE m.is_gym = true
  AND m.is_active = true
  AND m.end_date >= CURRENT_DATE;
```

### PT 미구매 회원 (피트니스 구매 O)
```sql
-- 피트니스 구매했지만 PT 미구매 회원
WITH gym_members AS (
    SELECT DISTINCT t.user_id
    FROM b_class_bmembership m
    JOIN b_payment_btransaction t ON m.transaction_id = t.id
    WHERE m.is_gym = true AND m.is_active = true
),
pt_members AS (
    SELECT DISTINCT t.user_id
    FROM b_class_bmembership m
    JOIN b_payment_btransaction t ON m.transaction_id = t.id
    WHERE m.is_gym = false AND m.is_trial = false AND m.is_active = true
)
SELECT gm.user_id
FROM gym_members gm
WHERE gm.user_id NOT IN (SELECT user_id FROM pt_members);
```

### 최근 7일 내 출석 여부
```sql
-- 최근 7일 내 출석한 회원
SELECT DISTINCT user_id
FROM b_checkin_bcheckinlog
WHERE is_succeed = true
  AND created >= CURRENT_DATE - INTERVAL '7 days';
```

### 가입 후 3일, 피트니스 O, 출석 O, PT 미구매
```sql
WITH target_users AS (
    -- 가입 후 3일 경과
    SELECT id as user_id
    FROM user_user
    WHERE date_joined BETWEEN
        CURRENT_DATE - INTERVAL '4 days'
        AND CURRENT_DATE - INTERVAL '3 days'
      AND is_active = true
),
gym_members AS (
    -- 피트니스 구매 회원
    SELECT DISTINCT t.user_id
    FROM b_class_bmembership m
    JOIN b_payment_btransaction t ON m.transaction_id = t.id
    WHERE m.is_gym = true AND m.is_active = true
),
attended_users AS (
    -- 최근 7일 출석 회원
    SELECT DISTINCT user_id
    FROM b_checkin_bcheckinlog
    WHERE is_succeed = true
      AND created >= CURRENT_DATE - INTERVAL '7 days'
),
pt_members AS (
    -- PT 구매 회원
    SELECT DISTINCT t.user_id
    FROM b_class_bmembership m
    JOIN b_payment_btransaction t ON m.transaction_id = t.id
    WHERE m.is_gym = false AND m.is_active = true
)
SELECT tu.user_id
FROM target_users tu
JOIN gym_members gm ON tu.user_id = gm.user_id
JOIN attended_users au ON tu.user_id = au.user_id
WHERE tu.user_id NOT IN (SELECT user_id FROM pt_members);
```

---

## 13. 데이터 계약 (Data Contract)

### 필수 조인 키
- **member_id (user_id)**: 모든 테이블 조인 기준
- 시간 컬럼: KST (Asia/Seoul) 기준

### 이용권-회원 연결 경로
```
user_user.id
    ↓
b_payment_btransaction.user_id
    ↓
b_class_bmembership.transaction_id
```

### 체크인(출석) 연결
```
user_user.id = b_checkin_bcheckinlog.user_id
```

### PT 연결
```
b_class_bmembership.id = b_class_bpersonaltraining.b_membership_id
```

---

## 14. 주의사항

1. **이용권-회원 연결**: `b_class_bmembership`에는 user_id가 직접 없음. `b_payment_btransaction`을 통해 연결해야 함.

2. **체크인 데이터**: `is_succeed = true`인 경우만 유효한 출석으로 카운트.

3. **PT 판별**:
   - `b_class_bmembership.is_gym = false`: PT/기타 이용권
   - `b_class_bpersonaltraining` 테이블에 레코드 존재: PT 배정됨

4. **시간대**: 모든 timestamptz 컬럼은 KST로 저장됨.

5. **지점 ID**: 연속적이지 않음 (1, 2, 16, 17, 18...). 쿼리 시 실제 ID 사용 필요.

---

*이 문서는 PT CRM 세그먼트 쿼리 작성을 위한 참조 문서입니다.*
*최종 업데이트: 2026-01-15 KST*
