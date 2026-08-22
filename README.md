# SASA FOOD

SASA 학생을 위한 급식표 및 식단 리뷰 PWA입니다. NEIS 급식 정보를 날짜별로 보여주며, 허용된 학교 계정으로 로그인하면 식단별 리뷰를 작성할 수 있습니다.

## 주요 기능

- 날짜별 조식·중식·석식 및 영양 정보 조회
- 날짜 선택기와 이전·다음 날짜 이동
- 식단별 별점 및 리뷰 작성·수정·삭제
- Google 로그인 및 학교 이메일 도메인 제한
- 사용자 선택을 저장하는 라이트·다크 테마
- 홈 화면 설치를 지원하는 PWA
- 서울 기준 오늘 전후 14일 급식 정보 오프라인 캐시

## 기술 구성

- Next.js 16 App Router
- React 19 / TypeScript
- Firebase Authentication / Firestore Admin SDK
- NEIS 급식식단정보 API
- Service Worker / Cache Storage
- Vercel 배포
- Google Cloud Run 기반 한국어 리뷰 유해 표현 분류

## 로컬 실행

Node.js 20 이상을 권장합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 프로덕션 빌드 검사는 다음과 같습니다.

```bash
npm run build
npm run start
```

## 환경변수

루트의 `.env.local`에 다음 값을 설정합니다. 실제 키와 Firebase Admin 비밀키는 저장소에 커밋하지 않습니다.

```dotenv
# NEIS
NEIS_API_KEY=
NEIS_OFFICE_CODE=
NEIS_SCHOOL_CODE=

# Firebase Web SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 접근 권한
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=
ALLOWED_EMAIL_DOMAIN=
ADMIN_EMAILS=

```

Firebase Authentication에서 Google 로그인을 활성화하고, 배포 도메인을 승인된 도메인에 추가해야 합니다. Firestore 클라이언트 접근은 규칙으로 차단되어 있으며 리뷰 작업은 서버 API를 통해 수행됩니다.

## 리뷰 유해 표현 분류

리뷰 작성과 수정 시 `moderation-server`에 배포된 `hongssi/final_abuse_manual_model`로 내용을 검사합니다. `allow` 판정만 Firestore에 저장하며 `review`와 `block`은 사용자에게 내용 수정을 요청합니다. 검사 서버가 응답하지 않으면 필터를 우회하지 않고 HTTP 503을 반환합니다.

기본 임계값은 다음과 같으며 Cloud Run 환경변수로 변경할 수 있습니다.

```dotenv
BLOCK_THRESHOLD=0.85
REVIEW_THRESHOLD=0.55
MAX_LENGTH=128
```

실제 급식 리뷰 표본으로 오탐과 미탐을 측정한 뒤 임계값을 조정해야 합니다.

### 모델 및 데이터 출처

- Model: [hongssi/final_abuse_manual_model](https://huggingface.co/hongssi/final_abuse_manual_model)
- Base model: `beomi/KcELECTRA-small`
- Training dataset: [Korean UnSmile Dataset](https://github.com/smilegate-ai/korean_unsmile_dataset)
- Dataset license: [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
- Dataset modifications: 없음
- Intended use: 비상업적 학교 급식 리뷰의 유해 표현 분류

## Cloud Run 모델 서버 배포

사전 준비:

1. Google Cloud 프로젝트와 결제 계정을 준비합니다.
2. [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)를 설치합니다.
3. `gcloud auth login`으로 로그인합니다.

PowerShell에서 다음 명령을 실행합니다.

```powershell
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

$moderationSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
gcloud secrets create moderation-secret --replication-policy=automatic
$moderationSecret | gcloud secrets versions add moderation-secret --data-file=-

$projectId = gcloud config get-value project
$projectNumber = gcloud projects describe $projectId --format="value(projectNumber)"
gcloud secrets add-iam-policy-binding moderation-secret `
  --member="serviceAccount:$projectNumber-compute@developer.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"

Set-Location moderation-server
gcloud run deploy sasa-food-moderation `
  --source . `
  --region asia-northeast3 `
  --allow-unauthenticated `
  --cpu 1 `
  --memory 1Gi `
  --min-instances 0 `
  --max-instances 1 `
  --concurrency 4 `
  --timeout 60 `
  --set-secrets MODERATION_SECRET=moderation-secret:latest `
  --set-env-vars BLOCK_THRESHOLD=0.85,REVIEW_THRESHOLD=0.55,MAX_LENGTH=128
```

Secret Manager 접근 권한 오류가 발생하면 Cloud Run 서비스 계정에 `Secret Manager Secret Accessor` 역할을 부여한 뒤 다시 배포합니다. Google Cloud 콘솔의 Cloud Run 서비스 설정에서도 같은 역할과 Secret 연결을 구성할 수 있습니다.

배포가 끝나면 출력된 서비스 URL을 확인합니다.

```powershell
$serviceUrl = gcloud run services describe sasa-food-moderation --region asia-northeast3 --format="value(status.url)"
Invoke-RestMethod "$serviceUrl/health"
```

분류 요청 테스트:

```powershell
$headers = @{ Authorization = "Bearer $moderationSecret" }
$body = @{ text = "테스트 리뷰입니다." } | ConvertTo-Json
Invoke-RestMethod "$serviceUrl/moderate" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
```

마지막으로 Vercel 프로젝트에 다음 환경변수를 등록하고 Next.js 앱을 다시 배포합니다.

```dotenv
MODERATION_API_URL=<Cloud Run 서비스 URL>
MODERATION_SECRET=<Cloud Run과 동일한 값>
MODERATION_TIMEOUT_MS=25000
```

Vercel 환경변수는 Production과 필요한 Preview 환경에 각각 등록합니다. `MODERATION_SECRET`에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

Cloud Run의 무료 사용량을 유지하기 위해 최소 인스턴스는 0, 최대 인스턴스는 1로 제한했습니다. 첫 요청은 컨테이너 및 모델 로딩 때문에 느릴 수 있습니다. 메모리 부족이 발생하면 `--memory 2Gi`로 다시 배포합니다.

## 오프라인 동작과 캐시

서비스 워커는 앱 셸과 정적 자산을 저장하고, 급식 데이터는 서울 기준 오늘 이전 14일부터 이후 14일까지 총 29일을 사전 저장합니다.

- 같은 날짜가 이미 저장되어 있으면 다시 요청하지 않습니다.
- 관리 범위 밖의 급식 캐시는 다음 사전 저장 시 삭제합니다.
- 로그인, 리뷰 조회·작성·수정·삭제에는 네트워크 연결이 필요합니다.
- 설치 직후 온라인 상태에서 앱을 한 번 실행해야 오프라인 자산이 준비됩니다.

배포 후 서비스 워커의 캐시 전략이나 정적 자산 구성이 바뀌면 `components/MealPage.tsx`와 `public/sw.js`의 `CACHE_NAME`을 동일한 새 버전으로 올립니다.

## 배포

Vercel 프로젝트에 GitHub 저장소를 연결하고 위 환경변수를 등록합니다. Production Branch로 push하면 운영 배포가 생성되고, 다른 브랜치는 일반적으로 Preview 배포가 생성됩니다.

배포 후에는 다음을 확인합니다.

1. 운영 도메인에서 새 배포 커밋이 사용되는지 확인합니다.
2. 날짜 이동, 테마 전환, Google 로그인을 확인합니다.
3. 리뷰 작성·수정·삭제 권한을 일반 사용자와 관리자 계정에서 확인합니다.
4. 온라인 상태에서 한 번 실행한 뒤 오프라인 모드로 다시 열어 봅니다.
5. 서비스 워커 변경 시 기존 설치 앱이 새 워커를 활성화했는지 확인합니다.
