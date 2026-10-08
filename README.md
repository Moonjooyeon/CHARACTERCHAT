# 온서 · CHARACTERCHAT

캐릭터 스토리 앱과 공개 정적 목업의 전체 소스입니다. 32개 작품(다중 캐릭터 시뮬레이션 3개 포함), 승인된 캐릭터 그림, 데이터베이스 마이그레이션, 검증 스크립트를 포함합니다.

## 구성
- `app/`: React/Vinext + Cloudflare Worker + D1/R2를 사용하는 작동형 앱. 계정별 작품·대화·기억·수집 에셋 저장을 구현합니다. 실제 AI 응답/이미지 생성/결제/신원·나이 인증은 미연결입니다.
- `public-mockup/`: 백엔드 없이 실행하는 정적 UI 목업. `dist/`가 실제 정적 앱 소스이며 빌드 캐시가 아닙니다. 입력은 현재 탭 메모리에만 있고 새로고침하면 초기화됩니다.
- 작품의 허구 비공개 설정과 반전도 이 공개 저장소에는 포함됩니다. 앱 내 계정 권한 보호와 소스 공개 여부는 별개입니다.

## 실행
Node.js 24 권장(앱 최소 22.13). 아래 명령은 저장소 루트 기준입니다.

### 정적 목업
```sh
cd public-mockup
npm test
python3 -m http.server 8080 --directory dist --bind 127.0.0.1
```
브라우저에서 http://127.0.0.1:8080 을 엽니다.

### 작동형 앱
```sh
cd app
npm run install:ci
npm run dev
```
초기 로컬 D1 스키마 적용과 격리 런타임 검증:
```sh
npm run build
bash scripts/verify-local-runtime.sh
```
이 검증은 임시 로컬 D1/R2를 만들며 운영 데이터에 연결하지 않습니다. 지속적인 로컬 실행에서는 개발 서버가 사용하는 동일한 로컬 D1에 `drizzle/*.sql`을 순서대로 적용해야 합니다. 인증·배포 구성은 자체 환경에서 설정해야 하며, 이 저장소를 푸시하는 것만으로 서비스가 배포되지는 않습니다. 기능·검증 세부 내용은 `app/README.md`를 확인하세요.

### 카탈로그 재생성
```sh
python3 public-mockup/scripts/sync-catalog.py
python3 public-mockup/scripts/sync-portraits.py
node public-mockup/scripts/verify.mjs
```
기본값은 `app/`의 현재 파일입니다. 선택적으로 이 저장소의 커밋 SHA를 인수로 주면 해당 커밋의 `app/` 경로에서 읽습니다.

## 반출 범위
원본 버전: 작동형 앱 v25 `b7fc911d63ecc888877179c8e228427a37edbccf`, 공개 목업 v10 `1796e038394398dfa1510ec5cd4ca5b6316bcbf0`.

현재 사용자 데이터베이스·대화 기록·업로드 저장소, 환경변수/인증키/토큰, 실행 캐시, node_modules, 원 서비스의 배포 프로젝트 ID는 포함하지 않습니다. 제외 대상 Ruby 원본은 포함하지 않으며 중립적인 준비 중 SVG만 사용합니다. 그림의 권리는 각 권리자에게 있으며 이 저장소가 별도의 재배포 라이선스를 부여하지 않습니다.

## 스냅샷 검증 참고
이 저장소는 비밀정보를 배제한 소스 스냅샷이며 원 개발 저장소의 과거 Git 객체는 포함하지 않습니다. `verify-catalog-keyword-upgrade.cjs`, `verify-dialogue-display.cjs`, `verify-simulations.cjs`는 원 개발 이력의 기준 커밋을 참조하므로 새 저장소에서 그대로 실행할 수 없습니다. 일부 UI 회귀 테스트의 작품 수/제목/소스 앵커 기대값은 최신 32개 작품과 맞지 않아 실패합니다. 전체 테스트 통과 또는 상용 배포 준비 완료를 의미하지 않습니다.
