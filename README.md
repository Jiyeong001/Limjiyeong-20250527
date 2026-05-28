# 올웨이즈 리뷰 진단 Agent

## 구조
```
always-review-agent/
├── server/           # Node.js + Express (API + 정적 파일 서빙)
│   ├── index.js
│   ├── crawler.js
│   ├── trustScore.js
│   └── summarizer.js
├── client/           # React + Vite
│   └── src/
├── package.json      # 루트 (서버 의존성)
└── .env
```

---

## 로컬 실행 (VS Code)

### 1. 환경변수 설정
```bash
cp .env.example .env
# .env 열어서 OPENAI_API_KEY=sk-... 입력
```

### 2. 의존성 설치 및 실행
터미널 하나로 끝:
```bash
npm install
npm start
# → http://localhost:4000
```

> `npm start` = 프론트 빌드 → 서버 실행 (한 번에)

### 개발 중 (핫리로드 원할 때)
터미널 2개:
```bash
# 터미널 1
npm run dev

# 터미널 2
cd client && npm install && npm run dev
# → http://localhost:5173 (프록시로 4000 연결)
```

---

## 배포 (Railway 하나로)

1. GitHub에 push
2. [railway.app](https://railway.app) → New Project → GitHub 연동
3. Variables 추가:
   - `OPENAI_API_KEY` = sk-...
4. Deploy → 생성된 URL 공유
