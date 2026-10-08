# 온서 · 비공개 캐릭터 스토리 프로토타입

작품 제작, 샘플 대화, 캐릭터별 수집 에셋, 대화 기억을 연결한 React/Vinext + Cloudflare Worker + D1/R2 앱입니다. 실제 LLM·이미지 생성·결제·신원/나이 인증은 연결하지 않았습니다.

## 현재 작동하는 기능
- 상단 가로 메뉴, 전체/남성향/여성향, 추천/랭킹/신작, 장르 및 검색
- 이 계정의 저장된 사용자-캐릭터 완료 대화 쌍을 바탕으로 캐릭터·장르 추천. 기록이 없으면 에디터 추천이며, 기록 없는 랭킹은 명확한 예시 순위입니다. 전체 이용자 인기 수치는 없습니다.
- `/works/:id` 상세 페이지, 선택 가능한 첫 장면, 세계관·인물·수집 조건, 새 대화 및 기존 대화 이어하기
- 별표로 감싼 행동 묘사를 기울임·별도 색상으로 렌더링. 짝이 없는 별표, 줄바꿈은 보존하고 HTML은 React 텍스트로 이스케이프합니다.
- 내 작품에서 불완전한 초안 저장, 표지·등장인물·첫 장면·공개 설정·비공개 설정·OOC·문체·길이 규칙을 각각 편집
- 기본 19+ 등급, 전체 이용가 선택. 소리·슬라임 및 해당 이미지를 쓰는 작품은 전체 이용가를 유지합니다. 19+ 접근은 서버에서 본인의 성인 이용 선언을 확인합니다. 이는 실제 나이 검증이 아닙니다.
- 캐릭터 에셋은 직접 올린 PNG/JPEG/WebP(최대 2 MB, 작품당 활성 30개)만 등록합니다. 공개 표지와 별개이며, 첫 장면/메시지 수/문구 포함 조건을 저장된 대화에서 서버가 판정합니다.
- R2 파일은 `/api/media/:id`에서 현재 계정의 수집 권한을 확인한 뒤 전달합니다. 미수집 파일은 거부하며 소유 작가는 명시적 편집 미리보기로 볼 수 있습니다. 정적 표지는 보호된 보상이 아닙니다.
- 에셋 스튜디오는 수집 권한이 생긴 이 계정의 에셋만 보여 줍니다. 처음에는 빈 상태입니다. 이전 데모 에셋·원장 데이터는 삭제하지 않으며, 새 수집함에는 노출하지 않습니다.
- 대화별 직접 입력 장기 기억(6,000자), 유저 노트(3,000자), 페르소나(2,000자). 페르소나는 이름·역할·성격·말투·관계 가이드 및 편집 가능한 템플릿을 지원합니다. AI 생성이 아닙니다.
- 메모리북: 기본 10턴(2–100턴)마다 완료된 대화 구간을 예약하고, 수동 작성/편집/고정을 지원합니다. 실제 AI 요약기가 없으므로 자동 내용은 생성하지 않고 `provider_required`로 둡니다. 새 답변 또는 설정 저장 시 검사하며 백그라운드 시간 스케줄러는 없습니다.
- 13개 상태 항목(날짜/요일/시각/장소/관계/감정/기분/PC 복장·세부/NPC 복장·세부/일정/속마음). 미입력은 미정이며 현재 값은 수동입니다. 제작자 및 대화별 항목 순서/이름/표시를 바꿀 수 있습니다.
- 상태창 구성 JSON 내보내기/가져오기. 필드 키·이름·순서·표시 설정만 담으며 실제 상태값, 대화, 페르소나, 기억, 비밀은 담지 않습니다. 공개 게시판이나 다중 이용자 공유 서비스는 아닙니다.

## 권한과 보존
이 Site는 소유자 비공개이며 모든 사용자 작품은 그 계정에만 보입니다. 공개 다중 제작자 플랫폼이 아닙니다. 공통 예시 카탈로그만 정적 작품으로 제공됩니다. 플랫폼 인증을 서버에서 확인하고, 작품·대화·에셋·기억·상태 쿼리에 계정 조건을 둡니다.

공개 작품 목록과 대화 응답에는 비공개 설정/OOC 규칙을 보내지 않습니다. 소유 작가는 별도 편집 읽기에서 확인합니다. 샘플 비밀도 클라이언트 카탈로그와 분리합니다. 향후 실제 모델에 전달한 비밀이 모델 출력에 절대 나오지 않는다고 보장할 수는 없습니다.

기존 3개 예시 ID·저장 작품·대화 스냅샷·데모 에셋·원장을 유지합니다. 새 마이그레이션은 별도 테이블만 추가합니다. 수집 권한은 조건 변경이나 신규 해금 중지 후에도 유지합니다. 요청 재시도/동시 업로드/할당량/요약 구간 중복 및 편집 revision 충돌을 서버에서 검사합니다.

## 실제 AI 연결 준비와 한계
`app/lib/providers.ts`는 서버 어댑터이며 현재는 명시적 샘플 답변만 제공합니다. `compileProviderContext`가 공개 작품, 제작자 규칙, 비공개 설정, 대화별 페르소나/노트/직접 기억, 최근·고정 메모리북(최대 10개), 수동 상태를 분리해 구성합니다. 저장된 규칙과 기억이 샘플 대사를 바꾸지는 않습니다. 별도 입력 글자 수가 모델 문맥·토큰 비용을 없애지 않습니다. 권장 길이는 정확한 출력 길이를 보장하지 않습니다.

상용화 전 실제 모델·요약 provider, 비용 한도, 실패 처리, 콘텐츠 안전/신고·차단, 연령 검증, 약관/개인정보 정책, 공개용 권한 모델을 별도로 구현하고 검증해야 합니다. 현금 결제는 없습니다. 옛 테스트 잉크 내역은 과거 기록으로만 표시됩니다.

## 개발 및 검증
Node 22.13+ (보안 검증 스크립트는 node:sqlite를 제공하는 Node 24 권장).
- `npm run install:ci`
- `npm run db:generate` (새 변경에만 사용, 적용된 마이그레이션은 수정하지 않음)
- `npx tsc --noEmit`
- `node scripts/verify-character-catalog.mjs`
- `node scripts/verify-security.cjs` (실제 SQLite 메모리 DB + 인증/R2 모형, 동시성 및 테넌트 격리)
- `node scripts/verify-ui-render.cjs` (컴포넌트/대화 포맷/상태/페르소나 렌더링)
- `npm run build`
- `QA_BASE=http://127.0.0.1:5182 node scripts/verify-runtime.mjs` (실제 로컬 Worker + 로컬 D1/R2)
- `node scripts/verify-overnight-ui.cjs` (격리 컴포넌트·비동기 중단/재시도 회귀 검사; 브라우저 화면 검증은 별도)

로컬 테스트는 각 drizzle SQL을 별도 로컬 DB에 적용한 뒤 wrangler dev로 수행합니다. 운영에는 Sites 게시 과정에서 마이그레이션을 적용합니다. 테스트 헤더는 로컬 검증 전용이며 운영에서는 플랫폼 dispatcher의 인증을 신뢰합니다.

## 이미지 및 참고
사용자가 제공한 캐릭터 일러스트 28장을 무손실 WebP로 사용합니다. 27번째 슬라임의 원본 전신은 포함하지 않고 이미지 준비 중 표지만 둡니다. 가상 이름/나이/이야기는 실제 인물의 신원·나이를 판정한 것이 아닙니다. 소리와 슬라임은 우정·모험의 비성적 이야기입니다.

- Eden 작품 상세의 정보 구조: https://www.eden-chat.com/works/90683257-af46-446e-adc3-9eae00255a7c
- Caveduck 제작자의 별도 문체 규칙/공개 소개: https://docs.caveduck.io/en/articles/Im-a-Creator-Too-183ad6c3
- Caveduck 대화 기억 설계 참고: https://docs.caveduck.io/en/articles/Automatic-Chat-Summary-7a96fa04
- Caveduck 페르소나 가이드: https://docs.caveduck.io/en/articles/-Chat-Feature-34c83557
- Rofan 트래커 공지(2026-08-25, 2026-09-09): https://rofan.ai/ 의 공지 메뉴

브랜드·문구·캐릭터 서사·코드는 온서용으로 제작했습니다. 특정 경쟁 서비스의 세부 제한을 그대로 구현했다고 주장하지 않습니다. 이전 서사 참고는 `CHARACTER_REFERENCES.md`에 남깁니다.


### V4 디자인
발견·상세·제작·대화·기억·에셋·다이얼로그에 단일 평면형 시각 체계를 적용했습니다. 가로 주 메뉴, 이미지 중심 카탈로그, 온전한 상세 표지, 읽기 중심 대화, 세 구역 제작 레이아웃을 사용합니다. 서이현 프로필을 추가하여 총 28개(남성향14/여성향14)이며 기존 저장 기록·표지·샘플ID와 서버 보호 로직을 변경하지 않습니다.


### V5 문단 가독성 및 은발 캐릭터
대사와 행동 묘사를 각각 독립 문단으로 렌더링하고 사이에 한 줄을 비웁니다. 기존 경계 줄바꿈은 중복 간격으로 쌓지 않으며, 문단 안의 줄바꿈과 별표 안의 마지막 공백은 보존합니다. 대화와 첫 장면 미리보기가 같은 문단 컴포넌트를 사용합니다. 은발 병약수 루시안 에델(29세)의 「은빛 백작의 미완성 항로」를 추가하여 총 29개(남성향 14/여성향 15)입니다. 기존 저장 데이터와 보호 로직은 유지됩니다.

- `node scripts/verify-dialogue-display.cjs` (실제 문단 형제 노드, 공백/줄바꿈/리터럴 보존, 기존 샘플 호환)
- `node scripts/verify-redesign-render.cjs` (전체 화면 컴포넌트 및 대화/미리보기 동일 문단 확인)

## v6 · 설정집과 이야기의 갈래

- **나의 설정집**: 계정별 페르소나와 상태창 구성 보관. 편집·복제·보관·복원, 페르소나의 8개 안내 항목, 새 대화 전 선택과 미리보기.
- **독립된 대화 설정**: 시작 시 페르소나/작품 설정을 복사. 이후 원본을 편집해도 기존 대화의 작품 맥락이나 샘플 응답이 바뀌지 않음. 대화 기억에서 명시적으로 편집한 페르소나는 그 대화만 변경.
- **상태창 공유**: 기본은 비공개. 저장된 이름/설명/항목 미리보기와 대상 확인 후 사이트 접근 권한이 있는 이용자에게만 공유. 사이트 자체의 접근 범위는 바꾸지 않음. 가져오기는 독립된 비공개 사본을 만들며 계정당 중복 저장 방지. 실제 가져온 계정 수만 표시. 공유 중단은 이미 복사된 사본을 회수하지 않음.
- **구성 전용 전달**: 서버는 13개 허용 항목의 이름/순서/표시 설정만 저장. 장면의 현재 값, 기억, 페르소나, 비공개 작품 설정은 공유/파일 내보내기에 포함되지 않음. 대화에 구성을 적용해도 현재 값은 유지되며 별도 저장으로 확정.
- **나의 대화**: 이름 변경, 이름/작품/페르소나/마지막 메시지 검색, 이어가기, 보관함과 복원. 최신 메시지 기준 정렬.
- **현재 장면의 갈래**: 마지막 완료 답변까지의 대화, 현재 페르소나/직접 기억/노트/메모리북/상태를 독립 복사. 출처 대화·시점·턴 수 보존. 원본은 유지. 현재 200턴까지 지원하며 과거 특정 턴의 상태를 재구성하지 않음. 요청 재시도는 같은 갈래를 반환하고, 새 메시지나 기억 수정이 있으면 다시 확인하도록 차단.
- **기억 제어**: 자동 요약 예약과 저장 요약의 문맥 포함 설정 분리. 자동 요약 간격 이전에도 완료된 미요약 구간을 직접 기록하고 고정 가능. 문맥에는 내용이 있는 요약을 고정/최근 순서로 최대 10개 포함. 실제 AI 요약·응답은 계속 미연결.
- **제작자 편집 안전성**: 작품 저장 revision 검사, 충돌 시 입력 유지, 다른 창의 저장을 덮어쓰지 않음. 미저장 수정 이동 확인과 비공개 필드 로드 완료 전 입력 차단. 테스트할 첫 장면 선택 후 페르소나를 고름.
- **온서의 폴리오 디자인**: 버건디 책등 선, 장/기록 번호, 세리프 제목, 절제된 표지와 긴 호흡의 본문. 작가 표시를 상세 상단에 명시하며 제공 작품의 작가는 ‘온서’. 사용자 작품의 작가명은 신뢰된 로그인 이름만 사용하고 이메일은 노출하지 않음.

### 검증과 제한

기존 보안/상태/대화/카탈로그 회귀에 더해 `verify-library-lifecycle.cjs`, `verify-library-concurrency.cjs`, `verify-branch-concurrency.cjs`, `verify-upgrade-migration.cjs`, `verify-library-ui.cjs`를 추가했습니다. SQL 테스트는 격리 SQLite, 인증/외부 저장/모델은 모의 객체입니다. 기존 11개 테이블의 모든 열 보존과 새 기본값을 확인합니다. 브라우저 레이아웃 검증은 별도 절차입니다.

실제 AI, 이미지 생성, 결제, 실제 본인·나이 인증은 연결되지 않았습니다. 상태창은 직접 기록하며 자동 상태 추론을 가장하지 않습니다. 원본 작품/대화/수집 에셋은 삭제하지 않습니다. 다른 플랫폼과의 기능·트래픽·서비스 규모 동등성을 의미하지 않습니다.

### 캐릭터 개편 근거

2026년 9월 7일–10월 7일의 공개·수정일과 현재 공식 노출을 확인한 사례를 참고해 29명의 목소리와 관계 갈등을 분화했습니다. 공식 월간 상승률은 검증되지 않았으므로 시장 전체의 ‘급상승 공식’이라고 표현하지 않습니다. 출처와 한계는 `CHARACTER_REFERENCES.md`에 있습니다. 기존 대화에는 새 성격·배경·샘플 대사가 소급되지 않습니다.

## v7 · 대화방 트래커와 짧은 작품 훅

- 대화 상단의 **트래커** 모달은 **트래커 / 공유 트래커**로 나뉩니다. 첫 탭은 작품 제작자가 붙인 상태창과 사용 안 함, 현재 별도 적용분을 보여 줍니다. 공유 탭에는 실제로 공유된 이용자 구성만 나타나며 이름·설명·제작자 검색, 실제 가져온 계정 수 기준 인기순, 수정일 기준 최신순을 제공합니다. 온서 기본 구성은 설정집의 별도 접힌 영역에 남아 있습니다.
- 미리보기·탭 전환·취소는 읽기 전용입니다. 적용 버튼은 revision을 검사한 뒤 해당 대화의 표시 구성만 변경합니다. 사용 안 함은 기록한 값을 지우지 않고 표시만 끄며, 갈래에서도 선택을 보존합니다. 공유 구성은 독립된 비공개 사본으로 가져오며 기존 사본은 중복 생성하지 않습니다. 제작자 작품이나 다른 대화는 바꾸지 않습니다.
- 제작자는 내 작품의 독립된 **트래커** 단계에서 이름·항목·순서를 편집합니다. 기존 작품은 13개 기본 항목으로 호환됩니다. 공유 제작자 별명은 사용자가 직접 적고 공유 확인 화면에 포함됩니다. 계정 식별자는 노출하지 않습니다. 기존 공유의 미지정 별명은 ‘익명 제작자’입니다.
- 29개 제공 작품에 실제로 짧은 `hook` 필드를 추가했습니다. 기존 상세 소개·세계관·인물 설정은 보존하고 읽기 쉬운 문단으로 표시합니다. 목록 훅과 제목은 CSS 말줄임 없이 줄바꿈되며 기본 14px 이상을 유지합니다. 기존 사용자 작품은 수정 없이 원래 소개를 표시하고, 직접 편집할 때 한 줄 소개를 새로 저장할 수 있습니다.
- 데스크톱 대화는 왼쪽 전체 높이 캐릭터 이미지와 오른쪽 대화로 구성됩니다. 공개 표지 또는 서버가 해금을 확인한 수집 이미지에 한해 전환하며, 미해금 URL은 이미지 선택기에 들어가지 않습니다. 좁은 화면은 단일 대화를 유지하고 이미지 펼치기를 제공합니다. 작품·대화 정보는 이미지 아래 펼침 영역으로 이동했습니다.

검증: `node scripts/verify-tracker-flow.cjs`는 격리 SQLite와 React 콜백으로 구성 적용/끄기/복원/갈래, 실제 공유만 노출, 중복 방지 카운트, 미리보기·취소 무변경, 오래된 수정 차단, 계정·대화 격리, 값·비밀 제외, 29개 훅과 해금 이미지 접근을 확인합니다. 기존 상태·페르소나·갈래·보안·대화 문단 회귀도 유지합니다. 실제 AI, 결제, 나이 인증, 자동 상태 추론의 미연결 제한은 그대로입니다.

## v8: message-level reading tools and Onseo side sheets
- The tracker picker is an Onseo folio side sheet with numbered creator/shared sources, preserving the existing configuration-only apply/import semantics.
- Chat header Assets shows the pinned public work cover and only server-authorized earned art. Locked entries expose conditions but no image URL. Choosing available art updates the existing left panel; mobile selection opens its image area.
- Messages support labeled persistent bookmarks with an exact-message jump list, edits with immutable prior-content revisions, and branches at completed assistant turns. Real reroll remains visibly unavailable while no AI provider is connected; it never changes messages or credits.
- Historical branches are explicitly transcript-only: they copy the selected completed prefix and pinned original work, reset unavailable past memory/persona/notes/status, and copy no later transcript or current summaries. Current-last-answer branching retains the existing current-state snapshot behavior. Both paths check source/revision state. Copies use padded IDs and strictly increasing copied timestamps when source timestamps tie; source rows remain unchanged. New messages append after the last stored message. Current-branch snapshot CAS also checks total message count, rejecting delayed concurrent inserts.
- Editing never regenerates later replies. All affected memory-book summaries retain their content but are marked invalidated and excluded from provider input until manually reviewed and saved again.
- Migration 0006 is additive. It adds message revision defaults and private revision/bookmark tables without rewriting existing works, text, memory, status, assets, or grants.
- Targeted isolated checks: `node scripts/verify-message-tools.cjs`, `node scripts/verify-message-races.cjs`, `node scripts/verify-message-tools-ui.cjs`, and the existing tracker/security/library/migration/dialogue/component regressions. Browser layout evidence is recorded separately; responsive CSS/source checks alone are not claimed as live mobile QA.

- v8 compatibility follow-up: unedited legacy assistant messages open in the editor with the same visible action markers and paragraph breaks. Saving an unchanged editor preserves the exact stored raw original; intentional edits save the formatted text. Version-0 preview/restore uses the same compatibility formatter while audit rows retain exact original bytes.

## 검붉은 메인 배너 · v12

발견 화면에 기존 「서점에는 두 사람 몫의 밤이 있다」의 성인 캐릭터 표지, 실제 제목·짧은 훅·작가와 작품 상세로 여는 단일 배너를 배치했습니다. 자동 전환이나 새 이미지 생성은 없습니다. 카탈로그와 타깃 필터는 바로 아래에 유지합니다.

전체 화면, 입력·선택·팝업·트래커·잠긴 에셋·알림을 차콜/검정 표면과 진홍색으로 통일했습니다. 밝은 대사와 푸른 행동 묘사를 서로 다른 색상으로 유지하고 기울임 및 문단 간격은 그대로 둡니다. 대화 표면에서 행동 9.13:1, 대사 15.49:1 대비를 검사했습니다. 기존 콘텐츠·등급·API·인증·데이터 저장 동작은 변경하지 않았습니다.

검증: `verify-nocturne-theme.cjs`는 배너 렌더·실제 작품을 여는 콜백·기존 이용 등급 검사·어두운 배경의 텍스트 대비를 확인합니다. 카탈로그·메뉴·대화·에셋 렌더 회귀와 타입 검사도 유지합니다. 반응형 규칙 검사는 실제 모바일 브라우저 검증을 대신하지 않습니다.

## 균형 있는 발견 순서 · v13

기본 추천 동점 순서를 기존 남녀 인물이 교차하도록 고정했습니다. 첫 줄은 서이현·서지안·우도겸·유설하·루시안(남3/여2), 다음 줄까지 합치면 남5/여5이며 한서인은 여성 인물로 계산합니다. 조용한 의상·얼굴 중심 표지 사이에 기존의 강조된 표지도 자연스럽게 배치했습니다. 이미지나 작품을 제거하거나 뒤로 일괄 격리하지 않습니다. 29개 작품, 원본 그림, 타깃 필터를 유지합니다. 저장된 취향 점수는 우선 적용하고, 랭킹·신작의 정렬 기준은 바꾸지 않았습니다.

## v15 · 답변별 스냅샷 확인창

캐릭터 답변 아래의 작은 **스냅샷** 버튼을 누르면 “이 장면을 이미지로 생성하시겠습니까?” 확인창만 표시합니다. 취소·닫기·Esc·배경 클릭으로 돌아갈 수 있으며, **생성** 버튼은 준비 중 상태로 비활성입니다. 모델 선택, 초안 저장, 이미지 생성, 비용 차감은 실행하지 않습니다. 기존 API·데이터베이스·에셋·기억·대화 설정은 변경하지 않았습니다.

사용자가 제공한 Caveduck 화면의 답변별 작은 스냅샷 진입을 참고했습니다. 실제 생성 서비스가 연결되었다는 의미는 아닙니다. `verify-snapshot-confirmation.cjs`로 답변별 진입, 사용자 메시지 제외, 취소 콜백, 생성 비활성 및 네트워크·저장 작업 부재를 확인합니다.

Current interruption and checkout regression coverage: `node scripts/verify-overnight-ui.cjs` and `node scripts/verify-launch-wallet.cjs`. The v3 `verify-upgrade-ui.mjs` fixture is quarantined behind `RUN_HISTORICAL_V3=1` because its UI assumptions are obsolete. Browser checks use the authenticated cloud browser; local Chromium launch is not supported in this environment.

## v16: 시작 흐름과 테스트 지갑
- 시작 창의 `페르소나 추가`에서 기존 가이드를 바로 쓰고, 비공개 설정집 저장 후 대화에 스냅샷을 적용합니다. 가이드 입력은 저장할 본문에 즉시 반영되며, 2,000자 초과 시 기존 자유 서술을 잘라내지 않습니다.
- 4개의 기존 작품 배너를 자동/수동으로 넘깁니다. 일시정지, 포커스·호버·비활성 탭 정지와 동작 줄이기를 지원합니다.
- 테스트 묶음 선택, ₩0 확인, 완료 기록과 이용 내역을 제공합니다. 실제 결제·카드 입력·AI 호출은 없으며, 서버의 고정 묶음/요청 중복 방지/누적 10,000 테스트 잉크 한도를 사용합니다. 이전 잔액과 기록은 그대로 남습니다.
- 설정집·기억·상태창·새 대화 초안의 이탈 확인, 전송 중 새 입력 보존, 동일 내용의 연속 전송, 저장 후 테스트 중 이탈을 검증합니다. 최초 대화 만들기와 새 페르소나 저장은 동일 요청을 안전하게 재시도합니다.
- 추가 검증: `verify-overnight-ui.cjs`, `verify-launch-wallet.cjs`, `verify-wallet-ui.cjs`, `verify-wallet-runtime.mjs`. 마지막 검사는 실제 로컬 Worker/D1만 대상으로 하며 공개 서버에 실행하지 못하도록 제한합니다. `verify-local-runtime.sh`가 기존 로컬 검증과 함께 실행합니다.

테스트 충전 중 응답이 끊겨도 서버에 남은 완료 기록을 다시 엽니다. 기록을 직접 확인하기 전에는 다른 요청으로 잉크가 한 번 더 지급되지 않습니다. 잔액과 내역은 같은 원장 스냅샷에서 계산합니다. `verify-wallet-recovery.cjs`, `verify-wallet-concurrency.cjs`는 응답/확인 손실, 창 닫기/재열기, 오래된 조회 응답, 원장 실패 롤백과 동시 충전을 독립적으로 검증합니다.

반응형 표지 전달: 원본 28개(48,468,564 bytes)는 그대로 유지하며 96/320/640/960px 파생 WebP와 srcset/sizes를 제공합니다. 보호된 수집 에셋은 이 변환에서 제외합니다. 앞 5개 표지의 640px 파일 합계는 380,106 bytes, 원본은 7,686,994 bytes입니다. 이는 파일 크기 비교이며 실제 최초 네트워크 전송량의 측정은 아닙니다. `verify-portrait-delivery.cjs`가 원본 해시·비율·각 파일·원본 대체 경로를 검사합니다. `qa-responsive`는 비공개 동일 출처 프레임의 화면 폭 점검용으로만 존재하며 일반 메뉴에는 연결하지 않습니다. 실제 휴대전화 검증을 대신하지 않습니다.

샘플 작품의 표시 작가는 목록·배너·상세에서 `익명`으로 통일했습니다. 실제 이용자가 고른 작가명/소유자는 바꾸지 않습니다. 이용 등급 값과 시작 전 확인은 유지하고, 19+ 표시는 그림을 가리지 않는 작은 중성색 모서리 배지로 정리했습니다. 배너·필터의 세로 여백을 줄여 작품 선반이 더 일찍 보이게 했습니다. `verify-display-attribution.cjs`와 `verify-modal-focus.cjs`(24개 격리 소스 추출 검사)로 표시 의미와 키보드 포커스/닫기/대기 중 겹침을 검증합니다.
