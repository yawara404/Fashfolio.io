# Fashfolio.io 再構築仕様・開発計画

更新: 2026-11-07。最新のユーザー指定「白をデフォルトにしたVRoid Studio風UI」「着せ替えゲーム風の衣装」「閲覧者の端末で画像生成」を優先する。以前のダーク基調、Pollinations・サーバー側rembgの案は、この構成に置き換える。

## コンセプト

絵師向けコーデプロンプトメーカー。服の部位・素材・配色を選び、試着でシルエットを確認し、日本語の作画設定・英語のAI用プロンプト・資料リンクを一括出力する。

参考資料は『イラストレーターのための現代ファッション大図鑑』。部位別の整理、形・素材・配色を見比べられる構成を参考にする。掲載画像は埋め込まず、標準衣装は独自のSVG図案として管理する。

## UIと画風

- VRoid Studioを主軸に、白いヘッダー・パネル、淡いグレーの作業面、パープルの選択色を使う。既存の落ち着いたスタジオの雰囲気を維持する。
- PCは固定の3ペイン。左はコーデ・配色、中央は衣装図鑑または試着、右は出力または衣装棚。ペイン内でスクロールする。
- gnavはReflens風の枠付き切り替え。`outfit`と`try-on`を中央に置く。スマホはメニューから切り替える。
- 服のカード、セル塗りの陰影、輪郭、着用状態、なし・ロック・即時反映を着せ替えゲーム風に整える。
- **試着キャラクターは画像生成した手描き風のデフォルメ萌えキャラ（少年・少女）。** 採用した透過PNGの顔と髪をそのまま表示する。ジト目、ハイライトなしの瞳、斜線のチーク。身体には白いスポーツ服姿の別素材を使い、色や顔パーツの追加カスタムは設けない。
- 頭身は最新のユーザー指示に合わせて5・6・7の3段階。少年は無造作ショート、少女は前髪と左右の毛束で描き分ける。既存キャラクターの画像は埋め込まない。
- `docs/GPT_PROMPT_MANNEQUIN.md`の基準骨格長3.80、頭頂Y=42、1頭身=612/headsの変換を使う。身体と衣装は共通座標、頭部は独立した等比変換。肩・肘・腰・股・膝・足首が服とずれないようにする。
- 標準42衣装は一覧と同一のSVGを、肩・胴・腰・脚の座標へ合わせて変形する。身頃と袖は別の変形領域、スカートは腰・ヒップ・裾の3段階で合わせる。頭・バッグ・アクセサリーも一覧の同じ素材を使う。生成PNGは部位の配置枠に合わせる。
- 標準衣装はパレットに連動する。生成PNGは生成時の色を保持する。試着は2Dのバランス確認用途。
- 試着ステージには素体／着衣、頭身ガイド、衣装配色、背景と倍率の表示設定を用意する。

## 画像生成

閲覧者のブラウザ内でStable Diffusion Turboを実行する。Python利用は許可されているが、Webサイトのイラスト生成計算を運営サーバーに移さない。

```text
outfit / try-on の「この部位の衣装を生成」
  → WebGPU対応チェック
  → 明示操作でモデルを取得（初回約2.51GB）・Cache Storageに保存
  → Web Worker内でCLIP → UNet → Euler 1ステップ → VAE
  → OffscreenCanvasで白い外周を簡易透過・余白を切り取り
  → プレビュー確認 → IndexedDBへPNGとメタデータを保存
  → 衣装棚へ追加・その場で着用 → コーデ保存・プロンプト出力
```

- ONNX Runtime WebのWebGPU実行。モデルと語彙は固定リビジョンのHugging Face公開データを使う。
- ページ表示時は大容量モデルを取得しない。「モデルを準備」を押してから取得する。
- プロンプトのトークン化、推論、背景処理、保存は端末内。画像生成APIへプロンプト・画像を送らない。
- 512×512、Seed指定、停止、モデルキャッシュ削除、PNG書き出しを用意する。
- WebGPU `shader-f16`・OffscreenCanvas・HTTPSまたはlocalhostが必要。非対応でも標準衣装・試着・通常プロンプトは使える。
- モデル取得の進捗、GPU準備、生成の各段階、容量・メモリ不足、保存失敗を表示する。
- 生成した衣装の形状ベースは試着サイズに使用する。ControlNet・LoRAは現時点では使用しない。生成結果の輪郭・形はプレビューで確認して追加する。
- キャラクター描画はVue + SVGで端末内処理。画像生成モデルを読み込まなくても素体と試着を使用できる。
- イラスト書き出しはSD系プロンプト（Positive / Negative）も合成して表示する。SD-Turbo自体は1ステップ・CFGなしのためNegative promptは使わないが、別のローカル拡散ツールで再調整する際の語彙として利用できる。

固定スタイルは「衣装単体・正面・白背景・明瞭な輪郭・セル塗り・着せ替えゲーム用パーツ」。SD-TurboはCFGやNegative promptを使わない。出力パネルのNegative promptは他の画像生成ツールで使うものとして扱う。

## Pythonと外部連携

- FastAPIはOllamaによる衣装提案・設定文の調整、Danbooru / Pinterestの資料検索を担当する。
- 通常のプロンプトはブラウザで合成する。標準カタログもフロントに同梱し、Pythonなしでも基本機能を使えるようにする。
- Ollamaは既存カタログと生成衣装のメタデータを使う。画像そのものは送らない。ロックを維持し、不明なIDは適用しない。
- 標準モデルはローカルにある `gemma3:4b`（Gemma 3 4B）。開発時の着用画像レビューにもローカルGemmaの画像認識を使用する。通常の衣装提案では画像を送らない。
- DanbooruはGeneral条件、Pinterestは公式APIの連携ユーザーのPin検索。接続できない場合はその状態を表示する。
- 資料のWeb検索リンクはAPI接続に関係なく出力する。生成衣装のAPI資料検索は、対応する標準の形状ベースを使う。
- 認証情報はbackendの環境変数に置き、ブラウザに渡さない。

## ディレクトリ構成

```text
Fashfolio_io/
├── PLAN.md
├── README.md
├── package.json
├── start.sh
├── frontend/
│   ├── app.vue
│   ├── pages/                 # outfit / try-on
│   ├── components/            # スロット・図鑑・試着・生成・出力
│   │   └── ui/                # 共通ヘッダーなど
│   ├── composables/           # useWardrobe / useDeviceGeneration
│   ├── workers/               # SD-Turbo推論
│   ├── utils/                 # 画像処理・IndexedDB・プロンプト合成
│   ├── data/                  # 同梱カタログ
│   ├── assets/css/            # 白いスタジオ・着せ替えUI
│   ├── public/garments/       # 42点の独自SVG
│   ├── public/ort/            # インストール時にコピーするWASM
│   ├── types/
│   ├── server/api/            # Pythonへのプロキシ
│   └── tests/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── data/catalog.json
│   ├── tests/
│   └── requirements.txt
├── scripts/                   # 起動・セットアップ・SVG作成・WASMコピー
└── docs/                      # 検証記録など
```

## APIとWorker契約

Nuxt `/api/*`からFastAPIへ転送する。

- `GET /api/catalog`: 標準衣装、部位、スタイル、配色。
- `POST /api/prompts`: 選択ID、配色、メモ、必要なら`custom_items`のテキスト情報を受け取り、設定・プロンプト・資料リンクを返す。`use_ai`でOllamaによる調整。
- `POST /api/recommend`: アイデア・ロック・スタイルに合わせ衣装IDと理由を返す。
- `GET /api/references`: 衣装に関連する外部資料。
- `GET /api/integrations`: 連携サービスの状態。

画像生成用のバックエンドAPIは設けない。Workerの入力は`prepare`または`generate { prompt, seed, cutout }`。出力は`status / ready / warning / error / result { image: Blob, seed, duration }`。

## 検証

- `npm run typecheck`、`npm run build`。
- `npm run test:frontend`: 基準骨格と共通変換、全衣装×5/6/7頭身、一覧と試着の素材・配色一致、衣装の反転・折り返し防止、スカートのヒップの被覆、採用した顔画像の一致、旧設定移行、生成PNGの部位配置、拡散処理・PNG保存を検証する。
- `npm run test:backend`: 不正ID・配色、生成衣装のテキスト情報、ロック維持、Ollama失敗、外部検索。
- 実ブラウザで白いUI、outfit / try-on、少年・少女、5/6/7頭身、衣装選択・配色と描画を確認する。
- 実際に確認した範囲と、GPU・モデル依存の未確認事項は`docs/VERIFICATION.md`に残す。
