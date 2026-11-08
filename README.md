# Fashfolio.io

**描きたい服を、言葉にする。** 絵師向けコーデプロンプトメーカー。

衣装パーツとカラーパレットを選び、日本語の作画設定文・英語のPositive / Negativeプロンプト・資料検索リンクをまとめて生成します。衣装イラストの生成は、閲覧者のブラウザ内でStable Diffusion Turboを動かして行います。

## 起動

Node.js 20.19+（22.12+推奨）、Python 3.11+ を使用します。

```bash
npm run setup  # 初回のみ。frontend/npm ci と Python仮想環境を準備
npm run dev    # Python APIとNuxtをまとめて起動。Ctrl+Cで両方停止
```

- 画面: http://127.0.0.1:3005
- Python API: http://127.0.0.1:8085
- API仕様: http://127.0.0.1:8085/docs

RefLensの既存サーバーとぶつからないよう、独立したポートを使います。変更する場合は `BACKEND_PORT=8086 FRONTEND_PORT=3006 npm run dev`。

## 使い方

1. 部位別の図鑑から衣装パーツを選びます。帽子・バッグ・ジュエリーを含む7部位、42点。
2. 配色プリセットまたはカラーピッカーで色を選び、作画メモを加えます。
3. 「プロンプトを生成」で日本語設定文・英語プロンプト・資料リンクを作ります。
4. 各形式をコピー、またはMarkdown / JSONを保存します。コーデ自体はブラウザに最大20件保存できます。
5. 「資料を探す」では、選択した衣装を元にPythonから外部APIを検索します。

選択内容を変えると出力に「変更あり」が表示されます。ファイル保存には再生成が必要です。図案は形・素材を考えるためのオリジナルSVGで、外部APIから取得した作品とは表示を分けています。

## 端末内の衣装イラスト生成とイラスト書き出し

outfitの衣装棚、またはtry-on右側の「この部位の衣装を生成」から開きます。

1. 形のベース、衣装名、衣装の説明（英語推奨）、Seedを選びます。
2. 「モデルを準備」を押すとHugging Faceから固定リビジョンのモデル約2.51GBとCLIP語彙を取得します。ページを開くだけでは取得しません。
3. 「この端末で生成する」で512×512の衣装を生成。白背景の簡易透過を選択できます。
4. 結果を確認し「衣装棚に追加して着用」。PNGも保存できます。コーデを保存すると生成衣装も次回呼び出せます。

試着の少年・少女には、画像生成スキルで作成した透過PNGを使用します。閲覧時は既存素材をブラウザ内で合成するため、アバター表示に画像生成モデルの読み込みは不要です。衣装の画像生成機能とは独立しています。

処理はWeb Worker内のONNX Runtime Web + WebGPUで実行します。画像生成APIやサーバーGPUは使いません。入力文は端末でトークン化し、生成画像はIndexedDBに保存。モデルはCache Storageに保存します。「モデルのキャッシュを削除」は生成衣装を消しません。停止ボタンはWorkerごと終了し、GPUメモリを解放します。

WebGPUの`shader-f16`、OffscreenCanvas、HTTPS（開発時はlocalhost）が必要です。PC版Chrome / Edge、メモリ8GB以上を推奨します。GPU・メモリが足りない端末では生成できません。非対応端末でも標準衣装と試着・通常プロンプトは使えます。保存不可のプライベートモード、サイトデータ削除、ブラウザの容量制限に注意してください。生成したPNGは必要に応じて書き出してください。

透過は白色の外周を除く簡易処理です。複雑な背景や白い服の輪郭、生成画像そのものの形にはばらつきがあります。ベース形状は試着の配置・サイズに使い、生成時のControlNet入力には使いません。生成PNGの色は生成時に確定し、後からのパレット切替では変わりません。SD-Turboは1ステップ・CFGなしで、Negative promptを使いません。出力パネルのNegative promptは他の画像生成ツール向けです。

実装参考：[Microsoftの公式SD-Turbo WebGPU例](https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/sd-turbo)、[ONNX Runtime WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)。[SD-Turboモデル詳細・ライセンス](https://huggingface.co/stabilityai/sd-turbo)、[使用するONNX重み](https://huggingface.co/schmuell/sd-turbo-ort-web)。ランタイム用WASMはインストール・起動・ビルド時に`copy-ort-assets.mjs`で同一バージョンからコピーします。

## outfit / try-on

白をデフォルトに、淡いグレーの作業面・パープルの選択色でVRoid Studio風の3ペインを構成しています。衣装はセル塗り風のオリジナルSVGです。ヘッダーの `outfit` はパーツ図鑑とプロンプト生成、`try-on` は選択中の衣装を着せる2D試着画面です。PCではReflensと同じ枠付きの切り替えナビを中央に配置し、選択中の画面をインディゴで表示します。スマホでは左上のメニューから切り替えられます。画面を行き来してもコーデと配色を共有します。試着画面は `/try-on` に直接アクセスできます。

試着キャラクターは、画像生成スキルで作った手描き風のデフォルメ萌えキャラです。採用した少女の顔・ボブの髪を元画像のまま使い、少年には同じ画風のショートヘアを用意しました。ジト目、瞳のハイライトなし、斜線の頬を維持します。身体には白いTシャツ・ショートパンツ・レギンス姿の別素材を使い、選択した服を上から着せます。素材は `frontend/public/avatars/`、生成プロンプトは `docs/design/character-implementation-prompts.md` に保存しています。

頭身は5（デフォルメ）・6（ナチュラル）・7（スタンダード）の3段階です。`docs/GPT_PROMPT_MANNEQUIN.md`の基準長3.80の骨格に沿って、身体と衣装に共通の変換をかけます。顔と髪は頭部の等比変換で保持し、肩・肘・腰・股・膝・足首と服の配置を揃えます。

右のアイテム一覧で着せ替え、左のコーデパネルで衣装の配色を変更できます。素体のみの表示、頭身ガイド、背景色、倍率も切り替え可能です。少年・少女の選択はこのブラウザに保存します。以前の髪色・肌色などの設定があっても、現行の白・薄灰の仕様へ移行します。

標準衣装42点は、図鑑のSVGをそのまま試着にも使用します。襟・リボン・模様・靴のストラップを別の図形へ描き直しません。身頃と袖を分けて肩・肘・手首へ合わせ、スカートは腰・ヒップ・裾の3段階で身体を包む形に補正します。配色も一覧と試着で共通です。素材の原本は `frontend/public/garments/`、同じ内容の描画用データは `frontend/data/garmentArtwork.json` で、`scripts/build_catalog.py` が両方を出力します。

比較画像: [少年・少女の5・6・7頭身](docs/previews/character-integrated-jito.png)、[42点の一覧・試着比較](docs/previews/catalog-fitting-comparison.png)、[スカートのヒップ補正](docs/previews/skirt-fit-corrected.png)。

## Ollama

標準カタログ・試着・通常のプロンプト生成はブラウザ内で動作し、PythonやOllamaへの接続がなくても使用できます。「Ollamaにコーデを相談」はカタログから衣装を提案し、「AIで整える」は選択済み衣装の説明を整えます。ロックしたパーツは提案でも維持します。

```bash
# Ollamaをインストールした環境で、未準備の場合のみ
ollama serve
ollama pull gemma3:4b
```

`backend/.env.example` を `backend/.env` にコピーしてモデル等を指定できます。既定値は `http://127.0.0.1:11434` / `gemma3:4b`（Gemma 3 4B）。このMacに存在するモデルを初期値にしています。モデルはアプリから自動ダウンロードしません。

AIが停止・タイムアウト・不正な応答を返した場合は、通常のプロンプト生成またはスタイル別ランダム提案に戻り、その旨を表示します。成功時だけ `Ollama` とモデル名を表示します。

## 外部API

設定する秘密情報は `backend/.env` に置きます。Nuxtのpublic runtime configやブラウザには渡しません。

| サービス | 設定 | 動作 |
| --- | --- | --- |
| Danbooru | 匿名で利用可能。必要なら `DANBOORU_LOGIN` / `DANBOORU_API_KEY` | 衣装タグ1つ + `rating:g` で検索。応答もGeneral作品だけに絞り、相対URLを正規化。429/503時はその旨を表示。 |
| Pinterest API v5 | `PINTEREST_ACCESS_TOKEN` | 公式 `/search/pins` は連携ユーザーのPin検索です。トークンとアプリの権限が必要。未設定時は「未接続」と表示。 |
| 検索リンク | 不要 | 各アイテムからDanbooru / PinterestのWeb検索URLを生成。API未接続でも利用可能。 |

Pinterest全体の検索を公式APIで行うには、別途利用制限のあるpartner searchへのアクセスが必要です。このアプリは一般公開Webのスクレイピングや非公式APIを使いません。

Nuxtの `/api/*` はPythonへの同一オリジンプロキシです。開発中もブラウザはPython・Ollamaに直接接続しません。本番ビルドの `NUXT_API_BASE` はサーバーだけに適用されます。Nuxtだけを静的配信してもPython機能は動作しません。

Danbooruの認証・検索タグ・ページング・テスト方法は [docs/DANBOORU_API.md](docs/DANBOORU_API.md) にまとめています。

## フォルダ構成

RefLensと同様に、NuxtのフロントエンドとPythonのバックエンドを分離しています。

```text
Fashfolio_io/
├── frontend/
│   ├── app.vue
│   ├── pages/index.vue
│   ├── components/         # コーデ、図鑑、アバター、試着、出力、資料検索
│   ├── composables/       # Pinia状態・API通信・端末内生成・アバター・イラスト書き出し
│   ├── workers/           # SD-Turbo WebGPU推論
│   ├── utils/             # IndexedDB・画像処理・プロンプト
│   ├── data/              # オフラインでも使える標準カタログ
│   ├── types/             # フロントエンドの型
│   ├── public/garments/   # 42点のオリジナル衣装SVG
│   └── server/api/        # Pythonへのプロキシ
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          # 設定
│   │   ├── models/        # Pydantic入出力スキーマ
│   │   ├── routers/       # APIエンドポイント
│   │   └── services/      # Ollama・外部API・プロンプト生成
│   ├── data/catalog.json
│   ├── tests/
│   └── requirements.txt
├── scripts/               # 起動・セットアップ・図案の再生成
├── docs/
└── start.sh
```

## 確認コマンド

```bash
npm run build
npm run typecheck
npm run test:frontend
npm run test:backend
```

バックエンドのみ: `cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8085`

フロントエンドのみ: `npm run dev:frontend`（Python APIは別途起動）

図鑑データと図案を再生成: `python3 scripts/build_catalog.py`

## デザイン参照

衣装をパーツごとに整理し、素材や配色とともに比較する考え方は、ユーザー提供の『イラストレーターのための 現代ファッション大図鑑』のスクリーンショットを参照。書籍画像の埋め込み・切り抜き・トレースはしていません。標準衣装はこのプロジェクトで作成したSVGです。画面は白をデフォルトとする固定3ペインで、姉妹サイトRefLensの枠付きナビゲーションと選択表示に揃えています。

旧UIと旧Nuxt内APIは `docs/legacy-ui/` に移行スナップショットとして残しています。現行アプリには読み込まれません。

## 実装で参照した公式仕様

- [Ollama Chat API](https://docs.ollama.com/api/chat)
- [Ollama Structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [Pinterest API v5 OpenAPI](https://github.com/pinterest/api-description/blob/main/v5/openapi.yaml)
- [Danbooru API](https://danbooru.donmai.us/wiki_pages/help:api)
