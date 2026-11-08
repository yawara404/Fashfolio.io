from fastapi import FastAPI
from app.routers import catalog, prompts, references, system

app = FastAPI(
    title="Fashfolio API",
    version="2.0.0",
    description="絵師向けコーデプロンプトメーカー。Nuxtの同一オリジンAPI経由で接続します。",
)
for module in (catalog, prompts, references, system):
    app.include_router(module.router, prefix="/api")
