import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app.services import danbooru_client, pinterest_client
from app.services.catalog import garments
from app.services.ollama_client import OllamaUnavailable
from app.models.outfit import AISelection, PromptText


class APITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_catalog_is_consistent_and_every_illustration_exists(self):
        response = self.client.get("/api/catalog")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["items"]), 42)
        browser_catalog = json.loads((Path(__file__).resolve().parents[2] / "frontend/data/wardrobe.json").read_text())
        self.assertEqual(browser_catalog, data)
        self.assertEqual(len({i["id"] for i in data["items"]}), 42)
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
        self.assertEqual(len(ids), 7)
        catalog = {i.id: i for i in garments()}
        self.assertEqual(len({catalog[id].category for id in ids}), 7)

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
        self.assertEqual(len(recommendation["item_ids"]), 7)

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


if __name__ == "__main__":
    unittest.main()
