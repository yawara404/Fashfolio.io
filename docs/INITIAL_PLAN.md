# 👗 fashfolio.io - イラスト衣装選定＆コーディネート支援ツール 開発計画書

> **キャッチコピー**: 絵描きの「服が決まらない」をゼロに。パーツとスタイルで即座に組める、イラスト特化の衣装探索キャンバス。

---

## 🎯 1. プロダクト概要 ＆ 解決する課題

### 💡 なぜ作るのか？ (Why)
- **絵描き最大のボトルネック**: キャラの顔や構図、ポーズは描けるのに「どんな服を着せようか」「シワやパーツの構造が分からない」で筆が止まる。
- **既存ツールの限界**:
  - **Pinterest**: 実写モデルの写真が多く、2Dイラスト（アニメ塗り・厚塗り・線画）への落とし込みが難しい。
  - **Google画像検索**: 「かわいい服」などの曖昧な言葉では同じような量産型デザインしか出てこない。
  - **ファッション誌**: ポーズやアングルが限定的で、パーツごとの組み合わせ（トップス×ボトムス×靴）を試せない。

### 🚀 解決策 (Solution)
- イラスト特化のタグ体系（Danbooru等の衣装・服飾タグ）と、ファッション写真（Pinterest）の双方を引用。
- **「着せ替えアバター感覚」**で、トップス・ボトムス・アウター・靴・小物をスロットに配置し、理想のトータルコーディネート資料を1分で完成させる。
- 完成した衣装セットは **[Reflens.io](https://reflens.wawa-app.me/) の無限キャンバスにワンクリック転送**し、そのまま作画用リファレンスボードとして活用できる。

---

## 🛠️ 2. 技術スタック

| 分野 | 技術選定 | 選定理由 |
| :--- | :--- | :--- |
| **フロントエンド** | **Nuxt 3 (Vue 3 + TypeScript)** | Vite爆速ビルド、SSR/SPA両対応、File-based Routing、VueUse連携 |
| **スタイリング** | **Tailwind CSS + Lucide Icons** | 洗練されたダークモードUI、カードグリッドレイアウトの素早い構築 |
| **状態管理** | **Pinia** | 現在の選択コーデ（各スロット）、お気に入り履歴、キャッシュ管理 |
| **BFF / APIプロキシ** | **Nuxt 3 Nitro Server Routes (`server/api/`)** | 外部API（Danbooru/Pinterest）のCORS回避、レート制限対策、画像キャッシュ |
| **衣装データ引用元** | **Danbooru API + Pinterest API** | 2D作画構造（Danbooru）× トレンド服飾（Pinterest）のハイブリッド |
| **エコシステム連携** | **Reflens.io 連携 API / JSON** | 組み立てた衣装ボードをReflensの無限キャンバスへシームレス共有 |

---

## 🎨 3. コア機能要件 (MVP / 初期バージョン)

### ① スタイル ＆ ジャンル別クイックセレクター
上部にスタイルのプリセットタグを配置し、ワンタップで絞り込み：
- **トレンド/ストリート**: Y2K, Techwear (テックウェア), Cyberpunk, Oversized, 韓国ストリート
- **ダーク/サブカル**: 地雷系, 量産型, ゴシック・ロリータ, パンク, 病みかわ
- **クラシック/トラッド**: アイビー・プレッピー, レトロ・ヴィンテージ, スチームパンク
- **ファンタジー/民族**: 中華風 (漢服/チャイナ), 和装・和モダン, 騎士・マント

### ② パーツ別着せ替えスロット (Fitting Board)
画面左側（または固定サイドバー）にスロットを配置：
1. **Head / Accessory**: 帽子, メガネ, ピアス, リボン
2. **Outer**: ジャケット, パーカー, カーディガン, コート
3. **Tops**: Tシャツ, ブラウス, ニット, キャミソール
4. **Bottoms**: プリーツスカート, デニム, カーゴパンツ, ショートパンツ
5. **Legwear / Shoes**: ニーハイ, ルーズソックス, ブーツ, スニーカー

### ③ 画像ソース連携エンジン
- **Danbooru API (`server/api/danbooru.get.ts`)**:
  - `https://danbooru.donmai.us/posts.json?tags=clothing_tags...`
  - メリット: `pleated_skirt`, `thighhighs`, `oversized_hoodie` など、アニメイラストの構造・シワ・線画が極めてわかりやすい。
  - セーフティフィルタ: `rating:g` (General / 全年齢向け) を強制付与して安全性を保証。
- **Pinterest API / oEmbed / Scraper (`server/api/pinterest.get.ts`)**:
  - 実写のリアルな布の質感、最新のコレクション、配色アイデアの参照用。

### ④ 配色パレット自動抽出
- スロットに選んだ画像群から、主要なカラーコード（HEX）を自動抽出し、画面上に「衣装カラーパレット」として提示（スポイトツールの代わり）。

### ⑤ [Reflens.io](https://reflens.wawa-app.me/) への一括エクスポート
- 「Reflensに送る」ボタンを押すと、選んだ画像のURL群とカラーパレットが1枚のリファレンスボードとして整形され、Reflensのキャンバスに直接インポート可能。

---

## 📐 4. ディレクトリ構成 (Nuxt 3)

```text
fashfolio_io/
├── PLAN.md                     # 本計画書
├── package.json
├── nuxt.config.ts
├── app.vue
├── assets/
│   └── css/main.css           # Tailwind / カスタムスタイル
├── components/
│   ├── CostumeGallery.vue      # 衣装画像一覧・無限スクロール
│   ├── FittingSlots.vue        # パーツ別スロット（着せ替えボード）
│   ├── StyleFilterBar.vue      # ジャンル・タグ絞り込みバー
│   ├── ColorPaletteBar.vue     # 抽出カラーパレット
│   └── ExportReflensModal.vue  # Reflens転送用モーダル
├── composables/
│   ├── useCostumeSearch.ts     # Danbooru / Pinterest 検索ロジック
│   └── useFittingBoard.ts      # スロット状態管理 (Piniaストア)
├── server/
│   └── api/
│       ├── costumes/
│       │   ├── danbooru.get.ts # Danbooruプロキシ (CORS対策 & rating:g強制)
│       │   └── pinterest.get.ts# Pinterest APIプロキシ
│       └── palette.post.ts     # 画像からの配色抽出
└── types/
    └── costume.ts              # 衣装メタデータ・スロット型定義
```

---

## 🚀 5. 実装ロードマップ (息抜きプロトタイプ手順)

- [x] **Step 1: Nuxt 3 プロジェクト立ち上げ**
  - `npx nuxi@latest init . --package-manager npm`
  - Tailwind CSS (`@nuxtjs/tailwindcss`) と Lucide (`lucide-vue-next`) の導入
- [x] **Step 2: Danbooru API プロキシの実装 (`server/api/costumes/danbooru.get.ts`)**
  - タグ検索 + `rating:g` で安全な2D衣装データを取得するNitroルート
- [x] **Step 3: フィッティングスロット ＆ ギャラリーUIの作成**
  - パーツ別スロット（Outer, Tops, Bottoms, Shoes）へカードをドラッグ＆ドロップまたはクリックでセット
- [x] **Step 4: Reflens.io 連携ボタンの実装**
  - 選択した衣装セットの画像URL・タイトルをJSONクリップボードコピー、または直接URLクエリでReflensへ渡す
- [ ] **Step 5: X（Twitter）進捗チラ見せ動画の撮影**
  - 「絵描きの衣装選び支援ツール作ってみた」で進捗ポスト投下
