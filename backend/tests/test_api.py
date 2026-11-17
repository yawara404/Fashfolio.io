import io
import json
from pathlib import Path
import struct
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app.routers import storage as storage_router
from app.services import danbooru_client, object_storage, pinterest_client
from app.services.catalog import garments
from app.services.ollama_client import OllamaUnavailable
from app.models.outfit import AISelection, PromptText


class APITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_individual_garment_colors_survive_prompt_generation(self):
        response = self.client.post("/api/prompts", json={
            "item_ids": ["sailor-top"], "garment_colors": {"sailor-top": ["#325577", "#ffffff", "#92909c"]}
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("#325577", response.json()["positive"])
        self.assertIn("#FFFFFF", response.json()["brief_ja"])
        invalid = self.client.post("/api/prompts", json={
            "item_ids": ["sailor-top"], "garment_colors": {"sailor-top": ["invalid"]}
        })
        self.assertEqual(invalid.status_code, 422)

    def test_recommendations_respect_audience_without_empty_category_crashes(self):
        index = {item.id: item for item in garments()}
        for audience in ("mens", "womens", "unisex"):
            response = self.client.post("/api/recommend", json={"audience": audience})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(all(index[id].audience in (audience, "unisex") for id in response.json()["item_ids"]))
        response = self.client.post("/api/recommend", json={"audience": "mens", "locked_ids": ["sailor-top"]})
        self.assertIn("sailor-top", response.json()["item_ids"])

    def test_catalog_is_consistent_and_every_illustration_exists(self):
        response = self.client.get("/api/catalog")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["items"]), 57)
        browser_catalog = json.loads((Path(__file__).resolve().parents[2] / "frontend/data/wardrobe.json").read_text())
        self.assertEqual(browser_catalog, data)
        self.assertEqual(len({i["id"] for i in data["items"]}), 57)
        for item in data["items"]:
            self.assertTrue(
                (
                    Path(__file__).resolve().parents[2]
                    / "frontend/public/garments"
                    / f'{item["id"]}.svg'
                ).is_file()
            )
        self.assertEqual(
            {i["category"] for i in data["items"]},
            {c["id"] for c in data["categories"]},
        )

    def test_prompt_contains_selected_garments_materials_palette_and_links(self):
        response = self.client.post(
            "/api/prompts",
            json={
                "item_ids": ["ribbon-blouse", "pleated-skirt", "handbag"],
                "palette": ["#e8bfcb", "#FAF7EF"],
                "notes": "袖をふんわり",
                "title": "春コーデ",
            },
        )
        self.assertEqual(response.status_code, 200)
        output = response.json()
        self.assertEqual(output["engine"], "template")
        self.assertIn("リボンタイブラウス", output["brief_ja"])
        self.assertIn("袖をふんわり", output["brief_ja"])
        self.assertIn("ribbon-tie blouse", output["positive"])
        self.assertIn("cotton texture", output["positive"])
        self.assertIn("dusty pink", output["positive"])
        self.assertEqual(output["palette"], ["#E8BFCB", "#FAF7EF"])
        self.assertEqual(len(output["references"]), 3)
        self.assertIn("rating%3Ag", output["references"][0]["danbooru"])
        self.assertIn(
            "pinterest.com/search/pins/", output["references"][0]["pinterest"]
        )

    def test_empty_unknown_duplicate_category_and_invalid_palette_rejected(self):
        for payload in (
            {"item_ids": []},
            {"item_ids": ["missing"]},
            {"item_ids": ["ribbon-blouse", "rib-knit"]},
            {"item_ids": ["ribbon-blouse"], "palette": ["red"]},
            {"item_ids": ["ribbon-blouse"], "palette": ["#ffffff; color:red"]},
        ):
            with self.subTest(payload=payload):
                self.assertEqual(
                    self.client.post("/api/prompts", json=payload).status_code, 422
                )

    def test_random_recommendation_preserves_locks_and_has_one_per_category(self):
        response = self.client.post(
            "/api/recommend",
            json={"style": "street", "locked_ids": ["ribbon-blouse", "mary-janes"]},
        )
        self.assertEqual(response.status_code, 200)
        ids = response.json()["item_ids"]
        self.assertTrue({"ribbon-blouse", "mary-janes"}.issubset(ids))
        self.assertEqual(len(ids), len({g.category for g in garments()}))
        catalog = {i.id: i for i in garments()}
        self.assertEqual(len({catalog[id].category for id in ids}), len({g.category for g in garments()}))

    def test_ai_failure_is_explicit_and_does_not_prevent_normal_generation(self):
        with patch(
            "app.routers.prompts.structured",
            new=AsyncMock(side_effect=OllamaUnavailable("offline")),
        ):
            output = self.client.post(
                "/api/prompts", json={"item_ids": ["ribbon-blouse"], "use_ai": True}
            ).json()
            self.assertEqual(output["engine"], "template")
            self.assertIn("通常生成", output["notice"])
            recommendation = self.client.post(
                "/api/recommend", json={"use_ai": True, "locked_ids": ["ribbon-blouse"]}
            ).json()
            self.assertEqual(recommendation["engine"], "random")
            self.assertIsNotNone(recommendation["notice"])
            self.assertIn("ribbon-blouse", recommendation["item_ids"])

    def test_invented_ai_ids_are_not_applied(self):
        with patch(
            "app.routers.prompts.structured",
            new=AsyncMock(
                return_value=AISelection(item_ids=["imaginary-dress"], reason="test")
            ),
        ):
            output = self.client.post(
                "/api/recommend", json={"use_ai": True, "locked_ids": ["mary-janes"]}
            ).json()
            self.assertEqual(output["engine"], "random")
            self.assertNotIn("imaginary-dress", output["item_ids"])
            self.assertIn("mary-janes", output["item_ids"])

    def test_ai_prompt_schema_does_not_replace_authoritative_reference_links(self):
        content = PromptText(
            brief_ja="衣装の説明",
            positive="ribbon blouse, pleated skirt",
            negative="blurry",
        )
        with patch(
            "app.routers.prompts.structured", new=AsyncMock(return_value=content)
        ):
            output = self.client.post(
                "/api/prompts", json={"item_ids": ["ribbon-blouse"], "use_ai": True}
            ).json()
            self.assertEqual(output["engine"], "ollama")
            self.assertEqual(output["brief_ja"], "衣装の説明")
            self.assertEqual(output["references"][0]["item_id"], "ribbon-blouse")

    def test_reference_endpoint_rejects_unknown_items_and_invalid_sources(self):
        self.assertEqual(
            self.client.get("/api/references?item_id=missing").status_code, 422
        )
        self.assertEqual(
            self.client.get(
                "/api/references?item_id=ribbon-blouse&source=invalid"
            ).status_code,
            422,
        )

    def test_local_generated_clothes_can_be_described_and_locked_without_uploading_images(self):
        custom = {**garments()[0].model_dump(), "id": "local-test", "name_en": "pink blouse with star buttons"}
        payload = {"item_ids": [custom["id"]], "custom_items": [custom]}
        output = self.client.post("/api/prompts", json=payload)
        self.assertEqual(output.status_code, 200)
        self.assertIn("star buttons", output.json()["positive"])
        recommendation = self.client.post("/api/recommend", json={**payload, "locked_ids": [custom["id"]]}).json()
        self.assertIn(custom["id"], recommendation["item_ids"])
        self.assertEqual(len(recommendation["item_ids"]), len({g.category for g in garments()}))

    def test_custom_metadata_cannot_override_builtin_clothes(self):
        custom = garments()[0].model_dump()
        response = self.client.post("/api/prompts", json={"item_ids": [custom["id"]], "custom_items": [custom]})
        self.assertEqual(response.status_code, 422)


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_danbooru_enforces_general_rating_and_filters_response(self):
        def handler(request):
            self.assertEqual(request.url.params["tags"], "blouse rating:g")
            self.assertEqual(request.url.params["limit"], "13")
            self.assertEqual(request.url.params["page"], "1")
            self.assertEqual(
                request.headers["User-Agent"],
                "Fashfolio/2.0 (costume reference tool)",
            )
            return httpx.Response(
                200,
                json=[
                    {
                        "id": 1,
                        "rating": "g",
                        "file_ext": "png",
                        "preview_file_url": "https://cdn.donmai.us/test.png",
                    },
                    {"id": 2, "rating": "e"},
                    {"id": 3, "rating": "g", "is_deleted": True},
                    {"id": 4, "rating": "g", "file_ext": "mp4"},
                ],
            )

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await danbooru_client.search("rating:e blouse", client=client)
        self.assertEqual([i["id"] for i in result["items"]], ["danbooru-1"])

    async def test_upstream_failure_is_not_fabricated_as_catalog_results(self):
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(lambda request: httpx.Response(429))
        ) as client:
            result = await danbooru_client.search("blouse", client=client)
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["items"], [])
        self.assertIn("集中", result["message"])

    async def test_danbooru_normalizes_relative_thumbnail_and_reports_more(self):
        def handler(request):
            self.assertEqual(request.url.params["tags"], "blouse rating:g")
            self.assertEqual(request.url.params["limit"], "13")
            return httpx.Response(
                200,
                json=[
                    {
                        "id": index,
                        "rating": "g",
                        "file_ext": "png",
                        "preview_file_url": f"/data/preview/{index}.png",
                        "tag_string_general": "blouse fashion",
                        "tag_string_artist": "artist",
                    }
                    for index in range(1, 14)
                ],
            )

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await danbooru_client.search("blouse", client=client)

        self.assertEqual(len(result["items"]), 12)
        self.assertTrue(result["has_more"])
        self.assertEqual(
            result["items"][0]["thumbnail"],
            "https://danbooru.donmai.us/data/preview/1.png",
        )
        self.assertEqual(result["items"][0]["credit"], "artist")

    async def test_danbooru_uses_basic_auth_only_with_complete_credentials(self):
        seen: list[str | None] = []

        def handler(request):
            seen.append(request.headers.get("Authorization"))
            return httpx.Response(200, json=[])

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            with patch.object(
                danbooru_client,
                "settings",
                SimpleNamespace(
                    danbooru_login="user",
                    danbooru_api_key="key",
                    danbooru_base_url="https://danbooru.donmai.us",
                    danbooru_timeout=8,
                ),
            ):
                await danbooru_client.search("blouse", client=client)
            with patch.object(
                danbooru_client,
                "settings",
                SimpleNamespace(
                    danbooru_login="",
                    danbooru_api_key="",
                    danbooru_base_url="https://danbooru.donmai.us",
                    danbooru_timeout=8,
                ),
            ):
                await danbooru_client.search("blouse", client=client)

        self.assertIsNotNone(seen[0])
        self.assertTrue(seen[0].startswith("Basic "))
        self.assertIsNone(seen[1])

    async def test_pinterest_missing_credentials_never_claims_connected(self):
        result = await pinterest_client.search("blouse", token="")
        self.assertEqual(result["status"], "not_configured")
        self.assertEqual(result["items"], [])

    async def test_pinterest_uses_official_user_search_and_keeps_token_server_side(
        self,
    ):
        def handler(request):
            self.assertEqual(
                str(request.url).split("?")[0],
                "https://api.pinterest.com/v5/search/pins",
            )
            self.assertEqual(
                request.headers["Authorization"], "Bearer secret-test-token"
            )
            return httpx.Response(
                200,
                json={
                    "items": [
                        {
                            "id": "123",
                            "title": "Cotton blouse",
                            "media": {
                                "images": {
                                    "400x300": {"url": "https://i.pinimg.com/test.png"}
                                }
                            },
                        }
                    ]
                },
            )

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await pinterest_client.search(
                "blouse", client=client, token="secret-test-token"
            )
        self.assertEqual(result["status"], "connected")
        self.assertEqual(
            result["items"][0]["url"], "https://www.pinterest.com/pin/123/"
        )
        self.assertNotIn("secret-test-token", json.dumps(result))

    async def test_pinterest_permission_error_is_actionable(self):
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(lambda request: httpx.Response(403))
        ) as client:
            result = await pinterest_client.search(
                "blouse", client=client, token="test"
            )
        self.assertEqual(result["status"], "unavailable")
        self.assertIn("権限", result["message"])


class _FakeR2Client:
    def __init__(self, fail_head=False):
        self.objects = {}
        self.fail_head = fail_head

    def head_bucket(self, Bucket):
        if self.fail_head:
            raise RuntimeError("unreachable")
        return {"Bucket": Bucket}

    def put_object(self, Bucket, Key, Body, ContentType="", CacheControl="", Metadata=None):
        self.objects[(Bucket, Key)] = {
            "Body": Body,
            "ContentType": ContentType,
            "Metadata": dict(Metadata or {}),
        }

    def get_object(self, Bucket, Key):
        entry = self.objects.get((Bucket, Key))
        if entry is None:
            from botocore.exceptions import ClientError
            raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
        return {
            "Body": io.BytesIO(entry["Body"]),
            "ContentType": entry["ContentType"],
            "Metadata": entry["Metadata"],
        }

    def delete_object(self, Bucket, Key):
        self.objects.pop((Bucket, Key), None)

    def generate_presigned_url(self, ClientMethod, Params, ExpiresIn):
        return f"https://signed.r2.test/{Params['Bucket']}/{Params['Key']}?exp={ExpiresIn}"


def _valid_png(width=64, height=64):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", len(ihdr)) + b"IHDR" + ihdr + b"\x00\x00\x00\x00"


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        storage_router._upload_bytes = 0
        storage_router._upload_day = 0
        storage_router._requests.clear()
        self.r2_settings = SimpleNamespace(
            r2_configured=True,
            r2_account_id="a" * 32,
            r2_bucket_name="fashfolio-io",
            r2_access_key_id="key",
            r2_secret_access_key="secret",
            r2_prefix="fashfolio",
            r2_daily_upload_mb=128,
        )
        self.vault = "b" * 64

    def test_status_and_integrations_report_unconfigured_by_default(self):
        unconfigured = SimpleNamespace(
            r2_configured=False,
            pinterest_token="",
            danbooru_login="",
            danbooru_api_key="",
        )
        with patch.object(storage_router, "settings", unconfigured):
            res = self.client.get("/api/storage/status")
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json(), {"configured": False, "provider": "local", "connected": None})
            self.assertEqual(
                self.client.get("/api/storage/workspace", headers={"X-Fashfolio-Vault": self.vault}).status_code,
                503,
            )

    def test_status_check_verifies_r2_connection(self):
        fake = _FakeR2Client()
        with patch.object(storage_router, "settings", self.r2_settings), patch.object(storage_router, "r2_client", return_value=fake):
            res = self.client.get("/api/storage/status?check=true")
            self.assertEqual(res.json(), {"configured": True, "provider": "r2", "connected": True})
        failing = _FakeR2Client(fail_head=True)
        with patch.object(storage_router, "settings", self.r2_settings), patch.object(storage_router, "r2_client", return_value=failing):
            res = self.client.get("/api/storage/status?check=true")
            self.assertEqual(res.json(), {"configured": True, "provider": "r2", "connected": False})

    def test_private_key_hashes_vault_and_rejects_invalid_headers(self):
        with patch.object(object_storage, "settings", self.r2_settings), patch.object(storage_router, "settings", self.r2_settings):
            self.assertEqual(self.client.get("/api/storage/workspace").status_code, 401)
            self.assertEqual(
                self.client.get("/api/storage/workspace", headers={"X-Fashfolio-Vault": "short"}).status_code,
                401,
            )
            key = object_storage.private_key(self.vault, "workspace.json")
            self.assertNotIn(self.vault, key)
            self.assertTrue(key.startswith("fashfolio/private/"))
            cache_key = object_storage.private_key(self.vault, "assets/x.png", cache=True)
            self.assertTrue(cache_key.startswith("fashfolio/cache/poses/"))

    def test_workspace_roundtrip_and_validation(self):
        fake = _FakeR2Client()
        headers = {"X-Fashfolio-Vault": self.vault}
        with patch.object(object_storage, "settings", self.r2_settings), patch.object(storage_router, "settings", self.r2_settings), patch.object(object_storage, "r2_client", return_value=fake), patch.object(storage_router, "r2_client", return_value=fake):
            self.assertEqual(self.client.get("/api/storage/workspace", headers=headers).status_code, 404)
            self.assertEqual(self.client.put("/api/storage/workspace", headers=headers, json={"version": 2}).status_code, 422)
            payload = {"version": 1, "updatedAt": "2026-11-17T00:00:00Z", "draft": None, "saved": [], "canvas": None, "garments": []}
            self.assertEqual(self.client.put("/api/storage/workspace", headers=headers, json=payload).status_code, 200)
            loaded = self.client.get("/api/storage/workspace", headers=headers)
            self.assertEqual(loaded.status_code, 200)
            self.assertEqual(loaded.json(), payload)

    def test_asset_put_get_delete_and_limits(self):
        fake = _FakeR2Client()
        digest = "c" * 64
        png = _valid_png(128, 128)
        headers = {"X-Fashfolio-Vault": self.vault, "Content-Type": "image/png", "X-Fashfolio-Bounds": json.dumps({"x": -10, "y": 20, "width": 480, "height": 480})}
        with patch.object(object_storage, "settings", self.r2_settings), patch.object(storage_router, "settings", self.r2_settings), patch.object(object_storage, "r2_client", return_value=fake), patch.object(storage_router, "r2_client", return_value=fake):
            self.assertEqual(self.client.put("/api/storage/assets/bad", headers=headers, content=png).status_code, 404)
            self.assertEqual(self.client.put(f"/api/storage/assets/{digest}", headers={"X-Fashfolio-Vault": self.vault, "Content-Type": "image/jpeg"}, content=png).status_code, 415)
            self.assertEqual(self.client.put(f"/api/storage/assets/{digest}", headers={"X-Fashfolio-Vault": self.vault, "Content-Type": "image/png"}, content=b"not-a-png").status_code, 422)
            self.assertEqual(self.client.put(f"/api/storage/assets/{digest}", headers={**headers, "X-Fashfolio-Bounds": '{"x":0}'}, content=png).status_code, 422)
            res = self.client.put(f"/api/storage/assets/{digest}?cache=true", headers=headers, content=png)
            self.assertEqual(res.status_code, 200)
            got = self.client.get(f"/api/storage/assets/{digest}?cache=true", headers={"X-Fashfolio-Vault": self.vault})
            self.assertEqual(got.status_code, 200)
            self.assertEqual(got.content, png)
            self.assertEqual(json.loads(got.headers["X-Fashfolio-Bounds"]), {"x": -10, "y": 20, "width": 480, "height": 480})
            self.assertEqual(self.client.delete(f"/api/storage/assets/{digest}?cache=true", headers={"X-Fashfolio-Vault": self.vault}).status_code, 200)
            self.assertEqual(self.client.get(f"/api/storage/assets/{digest}?cache=true", headers={"X-Fashfolio-Vault": self.vault}).status_code, 404)

    def test_daily_upload_limit_and_model_presigned_redirect(self):
        fake = _FakeR2Client()
        limited = SimpleNamespace(**{**self.r2_settings.__dict__, "r2_daily_upload_mb": 1})
        storage_router._upload_bytes = 1024 * 1024
        import time as _time
        storage_router._upload_day = int(_time.time() // 86400)
        with patch.object(object_storage, "settings", limited), patch.object(storage_router, "settings", limited), patch.object(object_storage, "r2_client", return_value=fake), patch.object(storage_router, "r2_client", return_value=fake):
            res = self.client.put(
                f"/api/storage/assets/{'d' * 64}",
                headers={"X-Fashfolio-Vault": self.vault, "Content-Type": "image/png"},
                content=_valid_png(),
            )
            self.assertEqual(res.status_code, 429)
            self.assertEqual(self.client.get("/api/storage/models/invalid/text", follow_redirects=False).status_code, 404)
            redirect = self.client.get(f"/api/storage/models/{'e' * 40}/text", follow_redirects=False)
            self.assertEqual(redirect.status_code, 307)
            self.assertIn("https://signed.r2.test/fashfolio-io/fashfolio/models/", redirect.headers["location"])


if __name__ == "__main__":
    unittest.main()
