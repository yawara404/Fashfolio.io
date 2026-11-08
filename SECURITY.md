# セキュリティポリシー / Security Policy

## サポート対象バージョン

サポート対象は **`main` ブランチの最新コミット** です。
過去のコミットやフォーク版は対象外です。

## 脆弱性の報告方法

セキュリティ上の問題や脆弱性を発見した場合は、**公開の Issue やプルリクエストには詳細を記載しないでください。**

1. GitHub リポジトリの **Security タブ → Report a vulnerability**（プライベート脆弱性報告機能）からの報告を推奨します。
2. 上記機能が利用できない場合は、リポジトリオーナー（`@yawara404`）へ GitHub 経由でご連絡ください。

### 報告に含める情報

- 問題の概要と再現手順（PoC / 概念実証コード）
- 影響を受けるファイル、コンポーネント、またはエンドポイント（例: `frontend/server/middleware/security.ts`, `backend/app/routers/*.py`）
- 想定される影響度および攻撃シナリオ

### 報告に含めない情報

- 本物の秘密情報（`DANBOORU_API_KEY`, `PINTEREST_ACCESS_TOKEN`, 内部トークン等）は絶対に貼らないでください。該当する値は報告前に必ず失効・再発行してください。

### 対応方針

- 受領確認は **2営業日以内** を目安にご連絡します。
- 修正は非公開の環境で準備・検証し、**修正が `main` ブランチへ反映された後** に開示を行います。

---

## 対象範囲

- **対象**: 本リポジトリのソースコード（FastAPI バックエンド / Nuxt フロントエンド / 独自 SVG アセット / 設定ファイル / CI ワークフロー）
- **対象外**: 依存する外部サービス自体の問題（Ollama, Danbooru, Pinterest, Hugging Face CDN など。各プロバイダの窓口へご連絡ください）
- **対象外**: セルフホスト運用者側のインフラ設定（OS, ネットワーク, HTTPS トンネル等）

---

## 本リポジトリで実施しているセキュリティ対策

1. **端末内推論によるプライバシー保護（Client-Side Privacy）**:
   - 衣装イラスト生成（Stable Diffusion Turbo）は閲覧者のブラウザ内（Web Worker + ONNX Runtime WebGPU）で完結します。
   - 入力したプロンプトや生成画像は外部の生成 API サーバーへ送信されず、端末内の IndexedDB に安全に保持されます。
2. **同一オリジン API プロキシ（CORS / CSRF 対策）**:
   - Nuxt の `/api/*` は同一オリジンのリクエストのみ許可します（`frontend/server/middleware/security.ts`）。
   - 外部オリジンや不正な `sec-fetch-site` からのリクエストは 403 Forbidden で即座に遮断されます。
3. **秘密情報・API トークンの完全分離**:
   - Danbooru / Pinterest / Ollama 等の認証情報は `backend/.env` にのみ配置され、ブラウザや Nuxt public config には一切渡されません。
   - `.env` や鍵ファイルは `.gitignore` に登録され、`scripts/check_publish.py` および CI でコミットを防止しています。
4. **外部 API 連携の検証とサニタイズ（SSRF / 注入対策）**:
   - 外部 API への通信は公式エンドポイントの HTTPS 接続のみを許可し、パラメータは Pydantic モデルで型検証・サニタイズされます。
   - ユーザー入力から直接任意の URL へのアクセスを許容するプロキシは実装していません。
5. **HTTP セキュリティヘッダーの適用**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
6. **サプライチェーン保護と継続的監査**:
   - Dependabot による weekly での依存関係監視（npm, pip, GitHub Actions）。
   - GitHub Actions CI での `npm audit` および `pip-audit` による高重大度脆弱性の自動検出。
   - `gitleaks` によるコミット前および CI での機密情報スキャン。

---

## セルフホスト運用者へ

Fashfolio.io を独自のサーバーでホストする場合、以下は運用者ご自身の責任で行ってください。

- HTTPS（SSL/TLS）の必須化（WebGPU の動作にも HTTPS または localhost が必須です）
- `backend/.env` のアクセス権限保護（`chmod 600`）
- サーバー OS および Node.js / Python 依存環境の最新化
