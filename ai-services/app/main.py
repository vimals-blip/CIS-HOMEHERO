from fastapi import FastAPI
from app.routes import pricing, dispatch, escrow, diagnostic

app = FastAPI(
    title="HomeHero AI Coprocessor",
    description="Asynchronous Python microservice for machine learning and combinatorial optimization.",
    version="1.0.0"
)

# Register routes
app.include_router(pricing.router, prefix="/api/v1/pricing", tags=["Pricing"])
app.include_router(dispatch.router, prefix="/api/v1/dispatch", tags=["Dispatch"])
app.include_router(escrow.router, prefix="/api/v1/escrow", tags=["Escrow"])
app.include_router(diagnostic.router, prefix="/api/v1/diagnostic", tags=["Diagnostic"])

@app.get("/health")
def health_check():
    return {"status": "healthy"}
