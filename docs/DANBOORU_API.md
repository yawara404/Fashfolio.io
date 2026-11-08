# Danbooru API 実装ガイド

Fashfolioの「資料を検索する」は、次の順に通信します。

```text
ReferenceExplorer.vue
  └─ $fetch('/api/references?...')            # ブラウザ → Nuxt（同一オリジン）
      └─ frontend/server/api/[...path].ts     # Nuxt → Python のプロキシ
          └─ FastAPI GET /api/references      # backend/app/routers/references.py
              └─ danbooru_client.search()     # backend/app/services/danbooru_client.py
                  └─ GET https://danbooru.donmai.us/posts.json?tags=...&limit=...&page=...
```

## 1. なぜブラウザから直接呼ばないのか

DanbooruはCORSを許可している場合もありますが、このアプリでは必ずPython経由にします。

- APIキーをブラウザへ渡さない。`DANBOORU_API_KEY` は `backend/.env` だけに置く。
- `rating:g` をサーバー側で強制できる。フロントやAIの出力で `rating:e` に差し替えられない。
- 返却フィールドを絞り、削除済み・BAN済み・動画などを除外できる。
- 429（レート制限）や503（Danbooru障害）を、アプリ共通の `unavailable` に変換できる。
- Python側でキャッシュ・リトライ・タイムアウトを一元管理できる。

Nuxtの `frontend/server/api/[...path].ts` は許可リスト方式です。新しいAPIを追加したら、正規表現にパスを足してください。

```ts
if (!/^(catalog|prompts|recommend|references|health|integrations)$/.test(path)) {
  throw createError({ statusCode: 404, statusMessage: "Unknown API route" });
}
```

## 2. Danbooru APIの最低限

| 項目 | 内容 |
| --- | --- |
| ベースURL | `https://danbooru.donmai.us` |
| 投稿検索 | `GET /posts.json?tags=blouse%20rating%3Ag&limit=12&page=1` |
| 認証 | HTTP Basic認証。ユーザー名とAPIキーを `auth=(login, api_key)` で渡す |
| APIキー | Danbooruの「My Account」→「Generate API Key」で発行 |
| 匿名利用 | 読み取りは可能。ただし制限や503時に不利なので、設定を推奨 |
| 1リクエストの上限 | `limit` は最大100件。Fashfolioは12件を使用 |
| ページ上限 | 通常ユーザーは1000ページ、Goldは5000ページ。`page=a<id>` / `page=b<id>` のIDページングも使える |
| タグ数 | メンバーは1検索あたり2タグまで。Fashfolioは「衣装タグ1つ + `rating:g`」で2タグに収める |
| レート制限 | 読み取りは概ね寛容だが、429と `X-Rate-Limit` ヘッダーを尊重する。実運用は1〜2 req/s程度に抑える |
| User-Agent | アプリ名と連絡先を名乗る。例：`Fashfolio/2.0 (costume reference tool)` |
| 評価 | `g`=General、`s`=Sensitive、`q`=Questionable、`e`=Explicit |
| 主な返却値 | `id`, `rating`, `file_ext`, `preview_file_url`, `large_file_url`, `tag_string_general`, `tag_string_artist`, `is_deleted`, `is_banned` |

### 2.1 認証

```python
auth = (settings.danbooru_login, settings.danbooru_api_key)
```

- 片方だけ設定されている場合は `None` にして匿名で動かす。
- APIキーをクエリ文字列（`?login=...&api_key=...`）で渡すと、アクセスログやプロキシログに残る可能性があるため、Basic認証を使う。
- `backend/.env` は `.gitignore` 済み。`NUXT_PUBLIC_*` やフロントの `runtimeConfig.public` には絶対に置かない。

### 2.2 検索タグの作り方

Fashfolioでは、カタログの `tags[0]` だけを使います。

```python
token = next(
    (t for t in tag.split() if re.fullmatch(r"[a-z0-9_-]{1,80}", t)),
    "blouse",
)
params = {"tags": f"{token} rating:g", "limit": 12, "page": page}
```

重要なのは、**ユーザー入力やAI出力をそのまま `tags` に連結しない**ことです。

- `rating:e` のようなメタタグは正規表現に一致しないため捨てられる。
- `status:banned` や `score:>100` も同様に捨てられる。
- 先頭の1タグだけを採用し、必ず `rating:g` を後ろに付ける。
- タグはDanbooruの表記（小文字・アンダースコア）に合わせる。`ribbon blouse` ではなく `ribbon` / `blouse` のように1語にする。

「2タグ制限」があるため、`blouse rating:g order:score` のように3タグ以上にしないでください。どうしても絞りたい場合は、1つの衣装タグを選び、`rating:g` だけで十分です。

### 2.3 ページング

```text
page=1, page=2, ...        # 数値ページ
page=b123456               # id 123456 より前（新しい順）
page=a123456               # id 123456 より後（古い順）
```

- 数値ページは1000ページまで（Goldは5000）。
- 深いページを連続取得するときは `b<最後のID>` を使うと、途中で投稿が増えてもズレにくい。
- FashfolioのUIは「もっと見る」程度なので、`page` は1〜100に制限している。

### 2.4 レート制限と障害時

- 429が返ったら、`Retry-After` があればその秒数待つ。連続リトライしない。
- 503はDanbooru側の障害（一時的な"Downbooru"ページ）。この場合は空配列を返し、UIには「接続できません」とWeb検索リンクを出す。
- 401/403は認証・権限・アクセス元の問題。APIキーの再発行やUser-Agentを確認する。
- 410はページ上限。`page` を下げるか、IDページングに切り替える。
- タイムアウトは8秒程度。UIを長時間待たせない。

## 3. 実装手順

### Step 1: 認証情報を `backend/.env` に置く

```bash
cp backend/.env.example backend/.env
```

```dotenv
DANBOORU_LOGIN=your_login
DANBOORU_API_KEY=your_api_key
```

匿名でも動きますが、APIキーを設定すると認証済みリクエストになります。キーはDanbooruのプロフィール画面から発行し、**チャット・Issue・スクリーンショットに貼らない**でください。

### Step 2: `backend/app/core/config.py` に設定を追加する

現行の `danbooru_login` / `danbooru_api_key` に加えて、接続先とタイムアウトも設定に追加しました。

```python
danbooru_base_url: str = os.getenv(
    "DANBOORU_BASE_URL", "https://danbooru.donmai.us"
).rstrip("/")
danbooru_timeout: float = float(os.getenv("DANBOORU_TIMEOUT", "8"))
```

### Step 3: サービス層を実装する

`backend/app/services/danbooru_client.py` の役割は、HTTP通信とレスポンス整形だけです。FastAPIの `HTTPException` は投げず、UIが扱いやすい `status` 付きの辞書を返します。

```python
import re
from urllib.parse import urljoin

import httpx

from app.core.config import settings

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
TAG_PATTERN = re.compile(r"[a-z0-9_-]{1,80}")
DEFAULT_LIMIT = 12


def _safe_tag(tag: str) -> str:
    """衣装タグを1つだけ取り出す。メタタグやrating:eはここで捨てる。"""
    for token in tag.lower().split():
        if TAG_PATTERN.fullmatch(token):
            return token
    return "blouse"


def _auth() -> tuple[str, str] | None:
    if settings.danbooru_login and settings.danbooru_api_key:
        return (settings.danbooru_login, settings.danbooru_api_key)
    return None


def _normalize(post: dict, token: str) -> dict | None:
    """APIの生データを、フロントが表示する最小限の形に変換する。"""
    if not isinstance(post, dict):
        return None
    if post.get("rating") != "g":
        return None
    if post.get("is_deleted") or post.get("is_banned"):
        return None

    extension = str(post.get("file_ext") or "").lower()
    if extension and extension not in ALLOWED_EXTENSIONS:
        return None

    preview = post.get("preview_file_url") or post.get("large_file_url")
    post_id = post.get("id")
    if not preview or not post_id:
        return None

    return {
        "id": f"danbooru-{post_id}",
        "source": "danbooru",
        "title": f"{token.replace('_', ' ')} #{post_id}",
        "url": f"{settings.danbooru_base_url}/posts/{post_id}",
        "thumbnail": urljoin(f"{settings.danbooru_base_url}/", preview),
        "credit": post.get("tag_string_artist") or "Danbooru",
        "tags": (
            post.get("tag_string_general") or post.get("tag_string") or ""
        ).split()[:20],
    }


async def search(
    tag: str,
    page: int = 1,
    client: httpx.AsyncClient | None = None,
    limit: int = DEFAULT_LIMIT,
) -> dict:
    token = _safe_tag(tag)
    page = max(1, min(page, 1000))
    limit = max(1, min(limit, 50))

    # limit+1件取り、最後の1件を「次ページがあるか」の判定に使う。
    params = {
        "tags": f"{token} rating:g",
        "limit": limit + 1,
        "page": page,
    }
    headers = {
        "User-Agent": "Fashfolio/2.0 (costume reference tool)",
        "Accept": "application/json",
    }

    async def execute(http: httpx.AsyncClient) -> tuple[list[dict], bool]:
        response = await http.get(
            f"{settings.danbooru_base_url}/posts.json",
            params=params,
            auth=_auth(),
            headers=headers,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            raise ValueError("Danbooru returned a non-list payload")

        items = [
            item
            for post in payload
            if (item := _normalize(post, token)) is not None
        ]
        return items[:limit], len(payload) > limit

    try:
        if client is not None:
            items, has_more = await execute(client)
        else:
            async with httpx.AsyncClient(
                timeout=settings.danbooru_timeout,
                follow_redirects=True,
            ) as http:
                items, has_more = await execute(http)
        return {
            "source": "danbooru",
            "status": "connected",
            "items": items,
            "message": None,
            "page": page,
            "has_more": has_more,
        }
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        message = (
            "Danbooruへのアクセスが集中しています。少し待って再試行してください。"
            if status == 429
            else "Danbooruの認証情報またはアクセス権限を確認してください。"
            if status in (401, 403)
            else "Danbooru APIに接続できません。資料リンクから検索できます。"
        )
        return {
            "source": "danbooru",
            "status": "unavailable",
            "items": [],
            "message": message,
            "page": page,
            "has_more": False,
        }
    except (httpx.HTTPError, ValueError, TypeError, KeyError, AttributeError):
        return {
            "source": "danbooru",
            "status": "unavailable",
            "items": [],
            "message": "Danbooru APIに接続できません。資料リンクから検索できます。",
            "page": page,
            "has_more": False,
        }
```

#### この実装のポイント

1. **`rating:g` をサーバーで付ける**：`tag` に何が入っても、最後に必ずGeneralを付ける。
2. **`_safe_tag` で1タグだけ採用**：`rating:e` や `order:score` は正規表現に一致せず捨てる。
3. **`limit + 1` で `has_more` を判定**：フィルタ後の件数ではなく、APIが返した生の件数で判定する。
4. **`urljoin` でサムネイルURLを正規化**：APIが相対URLを返しても壊れない。
5. **削除済み・BAN済み・動画を除外**：`is_deleted` / `is_banned` / `file_ext` を見る。
6. **例外をUI用の `unavailable` に変換**：スタックトレースやAPIキーをフロントへ漏らさない。

### Step 4: ルーターから呼ぶ

`backend/app/routers/references.py` は、カタログの `item_id` を衣装タグに変換してからサービスを呼びます。**ブラウザから任意の `tags` を受け取らない**のが重要です。

```python
import asyncio
from typing import Literal

from fastapi import APIRouter, Query

from app.services import danbooru_client, pinterest_client
from app.services.catalog import resolve_items

router = APIRouter()


@router.get("/references")
async def references(
    item_id: str,
    source: Literal["all", "danbooru", "pinterest"] = "all",
    page: int = Query(1, ge=1, le=100),
):
    # 存在しないIDや、カタログ外のタグはここで422になる。
    item = resolve_items([item_id])[0]

    jobs = []
    if source in ("all", "danbooru"):
        jobs.append(danbooru_client.search(item.tags[0], page))
    if source in ("all", "pinterest"):
        jobs.append(pinterest_client.search(item.name_en))

    # DanbooruとPinterestを並行実行する。片方が失敗しても、もう片方は返る。
    return {"providers": await asyncio.gather(*jobs)}
```

- `Literal` により `source=invalid` はFastAPIが422で拒否する。
- `page` は1〜100。UIの「もっと見る」には十分で、深いページの乱用を防ぐ。
- `asyncio.gather` はデフォルトで例外を伝播するが、各クライアントが例外を握って `unavailable` を返す設計なので、片方の障害で全体が落ちない。
- 返却は常に `{"providers": [...]}`。フロントの型 `ReferenceProvider` と一致させる。

### Step 5: Nuxtの同一オリジンプロキシを通す

`frontend/server/api/[...path].ts` は、許可したパスだけをPythonへ転送します。

```ts
const path = url.pathname.replace(/^\/api\//, "");
if (!/^(catalog|prompts|recommend|references|health|integrations)$/.test(path)) {
  throw createError({ statusCode: 404, statusMessage: "Unknown API route" });
}
return await proxyRequest(event, `${config.apiBase}/api/${path}${url.search}`);
```

- ブラウザは `https://danbooru.donmai.us` を直接叩かない。
- `config.apiBase` は `nuxt.config.ts` の `runtimeConfig.apiBase`（サーバー専用）。
- 新しいAPIを追加したら、この正規表現も更新する。更新を忘れると404になる。

### Step 6: フロントから呼ぶ

`ReferenceExplorer.vue` では `$fetch` でNuxtの同一オリジンAPIを呼びます。

```ts
const response = await $fetch<{ providers: ReferenceProvider[] }>(
  "/api/references",
  {
    query: {
      item_id: selectedItem.value?.baseId || itemId.value,
      page: 1,
    },
  },
);
providers.value = response.providers;
```

表示側の注意点：

- `image.thumbnail` が `null` のときは画像を出さず、「元の作品ページで確認」を表示する。
- `referrerpolicy="no-referrer"` を付けると、CDN側のホットリンク判定を避けやすい。
- `target="_blank"` と `rel="noopener noreferrer"` を付ける。
- `provider.status` が `unavailable` / `not_configured` のときは、空配列を「0件」と誤表示しない。`provider.message` を出す。
- 画像はプレビューのみ。原寸 `file_url` を大量に取得しない。
- `v-html` は使わない。Vueの `{{ }}` でエスケープする。

「もっと見る」を付ける場合は、`page` を状態に持って `page + 1` で再取得し、同じ `provider.source` の `items` に追記します。`has_more` が `false` ならボタンを隠します。

### Step 7: モックでテストする

外部APIに依存するとCIが不安定になるため、`httpx.MockTransport` でリクエストとレスポンスを固定します。既存の `backend/tests/test_api.py` と同じ形式です。

```python
import unittest
import httpx
from app.services import danbooru_client


class DanbooruClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_forces_general_rating_and_shapes_response(self):
        def handler(request: httpx.Request) -> httpx.Response:
            assert request.url.params["tags"] == "blouse rating:g"
            assert request.url.params["limit"] == "13"
            return httpx.Response(
                200,
                json=[
                    {
                        "id": 1,
                        "rating": "g",
                        "file_ext": "png",
                        "preview_file_url": "https://cdn.donmai.us/1.png",
                    },
                    {"id": 2, "rating": "e"},
                    {"id": 3, "rating": "g", "is_deleted": True},
                    {"id": 4, "rating": "g", "file_ext": "mp4"},
                ],
            )

        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handler)
        ) as client:
            result = await danbooru_client.search("rating:e blouse", client=client)

        self.assertEqual([item["id"] for item in result["items"]], ["danbooru-1"])
        self.assertEqual(result["status"], "connected")
        self.assertFalse(result["has_more"])

    async def test_429_is_reported_as_unavailable(self):
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(lambda request: httpx.Response(429))
        ) as client:
            result = await danbooru_client.search("blouse", client=client)

        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["items"], [])
        self.assertIn("集中", result["message"])
```

テストで確認すべきこと：

- `tags` に必ず `rating:g` が入る。
- `rating:e` を渡しても、クエリは `blouse rating:g` になる。
- `rating != "g"`、`is_deleted`、`is_banned`、動画が除外される。
- 429 / 503 / タイムアウトで `unavailable` になり、架空の結果を返さない。
- APIキーがレスポンスJSONに含まれない。

## 4. 実装の適用状況

このガイドの改善版は `backend/app/services/danbooru_client.py` に適用済みです。

| 項目 | 適用前 | 適用後 |
| --- | --- | --- |
| `rating:g` の強制 | あり | あり |
| タグのサニタイズ | あり（1タグ） | あり（1タグ） |
| Basic認証 | あり | あり（両方設定時のみ） |
| 削除済み・BAN・動画の除外 | あり | あり |
| 失敗時の `unavailable` | あり | あり（429/401/403を分岐） |
| `has_more` | フィルタ後の件数で判定 | APIの生件数 `limit+1` で判定 |
| サムネイルURL | そのまま返す | `urljoin` で絶対URLに正規化 |
| リダイレクト | `follow_redirects=False` | `True` |
| `page` の範囲 | Routerで1〜100 | Clientでも1〜1000にクランプ |
| タイムアウト | 8秒固定 | 設定値 `DANBOORU_TIMEOUT` |
| テスト | MockTransportで検証済み | 17件（相対URL・429・認証分岐を追加） |

`backend/app/core/config.py` と `backend/.env.example` に `DANBOORU_BASE_URL` / `DANBOORU_TIMEOUT` を追加済みです。認証情報を設定したら次を実行します。

```bash
npm run test:backend
```

## 5. セキュリティ・権利・運用

### 秘密情報

- `DANBOORU_API_KEY` は `backend/.env` のみ。`.env` は `.gitignore` 済み。
- `NUXT_PUBLIC_*`、`runtimeConfig.public`、ブラウザの `localStorage` に置かない。
- エラーログに `Authorization` ヘッダーやAPIキーを出さない。
- APIキーをGit履歴にコミットした場合は、Danbooruで再発行する。

### コンテンツ

- `rating:g` は「General」カテゴリであり、あらゆる環境で安全を保証するものではない。UIに「外部サイトの資料」である旨を表示する。
- 画像の著作権は各作家に帰属する。プレビュー表示と作品ページへのリンクに留め、原寸画像の再配布・一括ダウンロード・学習データ化はしない。
- Danbooruの利用規約とレート制限を守る。スクレイピングで回避しない。
- 衣装タグはユーザー生成のメタデータなので、ファッション用語としての正確性は保証されない。プロンプトの主情報にはカタログの `name_en` / `material_en` を使い、Danbooruは資料検索に限定する。

### 可用性

- Danbooruが503のときは、空配列＋`unavailable`＋Web検索リンクにフォールバックする。
- 429のときは `Retry-After` を尊重し、クライアント側で自動連打しない。
- 同じタグ・ページの結果を短時間キャッシュすると、レート制限と表示速度の両方に効く。キャッシュキーは `tag:page:limit`、TTLは5〜15分程度から始める。
- サムネイルはDanbooruのCDNを直接参照するため、画像取得までPythonでプロキシしない。帯域と著作権の面で有利。

## 6. トラブルシューティング

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| 401 Unauthorized | ログイン名/APIキーが違う、キー再発行済み | `backend/.env` を修正してPythonを再起動 |
| 403 Forbidden | アクセス元の制限、User-Agent、権限不足 | User-Agentを設定し、時間を置いて再試行 |
| 410 Gone | ページ上限超過 | `page` を下げる。深い取得は `page=b<id>` へ |
| 429 Too Many Requests | レート制限 | `Retry-After` 待ち、リクエスト頻度を下げる、キャッシュ |
| 503 Service Unavailable | Danbooru側の障害（Downbooru） | 空配列＋Web検索リンクを表示。時間を置く |
| 結果が0件 | タグが存在しない、`rating:g` が厳しい、2タグ制限超過 | タグを1つに絞る。Web検索リンクも併用 |
| サムネイルが壊れる | `preview_file_url` がnull/相対URL、削除済み | `urljoin` と `null` チェック、`file_ext` フィルタ |
| ブラウザでCORSエラー | Danbooruを直接呼んでいる | Nuxtの `/api/references` 経由に統一 |
| フロントが404 | Nuxtプロキシの許可リスト漏れ | `[...path].ts` の正規表現に `references` を追加 |

## 7. 動作確認

### 単体テスト

```bash
cd /path/to/Fashfolio_io
npm run test:backend
```

### 実APIをcurlで確認

```bash
cd /path/to/Fashfolio_io/backend
set -a; . ./.env; set +a

curl -sS --max-time 20 \
  -u "$DANBOORU_LOGIN:$DANBOORU_API_KEY" \
  -A 'Fashfolio/2.0 (costume reference tool)' \
  'https://danbooru.donmai.us/posts.json?tags=blouse%20rating%3Ag&limit=2' \
  | python -m json.tool | head -40
```

匿名で確認する場合は `-u` を外します。APIキーが空でも読み取りはできますが、本番運用では設定してください。

### アプリ経由で確認

```bash
npm run dev
```

1. ブラウザで `http://127.0.0.1:3005/try-on` を開く。
2. 右ペインで衣装を選び、「資料を検索する」を押す。
3. Danbooruセクションが `接続済み` なら成功。`接続できません` ならPythonのログと `backend/.env` を確認する。
4. 画像をクリックし、Danbooruの作品ページへ遷移することを確認する。

> 2026-11-07時点では、Danbooru本体がHTTP 503（"Downbooru"）を返していました。この場合もアプリは `unavailable` とWeb検索リンクを表示するため、モックテストとUIフォールバックで検証します。
