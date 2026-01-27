from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import httpx
import uuid

app = FastAPI(title="FinPlay - Financial Literacy Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "Frontend")

SUPABASE_URL = "https://auxgtrjdshuedaidjtdj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1eGd0cmpkc2h1ZWRhaWRqdGRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTUzMDYzOSwiZXhwIjoyMDg1MTA2NjM5fQ.7oybi4Le3JdVERekq3ZjDm_ShINkl_XiUUn8H9MjE0U"

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

INCOME_BY_LIFE_STAGE = {
    "Student": 15000,
    "Just Started Working": 30000,
    "Young Professional": 50000,
    "Independent Adult": 75000
}

XP_BY_KNOWLEDGE = {
    "Beginner": 50,
    "Some Knowledge": 75,
    "Intermediate": 100
}

class OnboardingData(BaseModel):
    name: str
    knowledge_level: str
    life_stage: str
    primary_goal: str

class ProfileResponse(BaseModel):
    name: str
    balance: int
    income: int
    xp: int
    level: int
    focus_goal: str
    knowledge_level: str
    life_stage: str

class Position(BaseModel):
    id: str
    type: str
    name: str
    quantity: float
    avg_price: float
    current_price: float
    buy_month: Optional[int] = None
    principal: Optional[float] = None
    rate: Optional[float] = None
    tenure: Optional[int] = None
    maturity_month: Optional[int] = None

class Transaction(BaseModel):
    tx_id: str
    date: str
    type: str
    asset_id: str
    asset_type: str
    quantity: float
    price: float
    cash_change: float

class Budget(BaseModel):
    month: int = 1
    allocated: bool = False
    needs: int = 0
    wants: int = 0
    savings: int = 0
    needsRemaining: int = 0
    wantsRemaining: int = 0
    savingsRemaining: int = 0
    expensesPaid: List[str] = []
    monthHistory: List[Dict] = []

class Profile(BaseModel):
    user_id: str
    name: str
    income: int
    life_stage: str
    knowledge_level: str
    focus_goal: str
    balance: int = 0
    xp: int = 0
    level: int = 1
    budget: Optional[Dict] = None

class Portfolio(BaseModel):
    cash: float
    positions: List[Position] = []
    transactions: List[Transaction] = []
    market_scenario: str = "bull"
    investMonth: int = 1
    startMonth: int = 1
    achievements: Dict = {}

class MarketAsset(BaseModel):
    id: str
    type: str
    name: str
    sector: str
    basePrice: Optional[float] = None
    price: float
    volatility: Optional[float] = None
    rate: Optional[float] = None
    tenure: Optional[int] = None
    icon: str
    description: str

class GameState(BaseModel):
    profile: Profile
    portfolio: Optional[Portfolio] = None
    market: Optional[List[MarketAsset]] = None

@app.post("/users/onboard")
async def onboard_user(data: OnboardingData):
    if not data.name or not data.knowledge_level or not data.life_stage or not data.primary_goal:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid onboarding data"}
        )
    
    income = INCOME_BY_LIFE_STAGE.get(data.life_stage, 15000)
    xp = XP_BY_KNOWLEDGE.get(data.knowledge_level, 50)
    user_id = str(uuid.uuid4())
    
    profile = {
        "user_id": user_id,
        "name": data.name,
        "balance": 100000,
        "income": income,
        "xp": xp,
        "level": 1,
        "focus_goal": data.primary_goal,
        "knowledge_level": data.knowledge_level,
        "life_stage": data.life_stage,
        "budget": {
            "month": 1,
            "allocated": False,
            "needs": 0,
            "wants": 0,
            "savings": 0,
            "needsRemaining": 0,
            "wantsRemaining": 0,
            "savingsRemaining": 0,
            "expensesPaid": [],
            "monthHistory": []
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=get_headers(),
            json={
                "user_id": user_id,
                "name": data.name,
                "balance": 100000,
                "income": income,
                "xp": xp,
                "level": 1,
                "focus_goal": data.primary_goal,
                "knowledge_level": data.knowledge_level,
                "life_stage": data.life_stage,
                "budget": profile["budget"]
            }
        )
    
    return profile

@app.post("/sync/save")
async def sync_save(state: GameState):
    user_id = state.profile.user_id
    
    async with httpx.AsyncClient() as client:
        profile_data = {
            "user_id": user_id,
            "name": state.profile.name,
            "income": state.profile.income,
            "life_stage": state.profile.life_stage,
            "knowledge_level": state.profile.knowledge_level,
            "focus_goal": state.profile.focus_goal,
            "balance": state.profile.balance,
            "xp": state.profile.xp,
            "level": state.profile.level,
            "budget": state.profile.budget,
            "updated_at": "now()"
        }
        
        await client.delete(
            f"{SUPABASE_URL}/rest/v1/profiles?user_id=eq.{user_id}",
            headers=get_headers()
        )
        await client.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=get_headers(),
            json=profile_data
        )
        
        if state.portfolio:
            await client.delete(
                f"{SUPABASE_URL}/rest/v1/portfolios?user_id=eq.{user_id}",
                headers=get_headers()
            )
            await client.delete(
                f"{SUPABASE_URL}/rest/v1/positions?user_id=eq.{user_id}",
                headers=get_headers()
            )
            await client.delete(
                f"{SUPABASE_URL}/rest/v1/transactions?user_id=eq.{user_id}",
                headers=get_headers()
            )
            
            portfolio_id = str(uuid.uuid4())
            portfolio_data = {
                "id": portfolio_id,
                "user_id": user_id,
                "cash": state.portfolio.cash,
                "market_scenario": state.portfolio.market_scenario,
                "invest_month": state.portfolio.investMonth,
                "start_month": state.portfolio.startMonth,
                "achievements": state.portfolio.achievements,
                "updated_at": "now()"
            }
            await client.post(
                f"{SUPABASE_URL}/rest/v1/portfolios",
                headers=get_headers(),
                json=portfolio_data
            )
            
            if state.portfolio.positions:
                positions_data = []
                for pos in state.portfolio.positions:
                    positions_data.append({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "asset_id": pos.id,
                        "asset_type": pos.type,
                        "name": pos.name,
                        "quantity": pos.quantity,
                        "avg_price": pos.avg_price,
                        "current_price": pos.current_price,
                        "buy_month": pos.buy_month,
                        "principal": pos.principal,
                        "rate": pos.rate,
                        "tenure": pos.tenure,
                        "maturity_month": pos.maturity_month
                    })
                if positions_data:
                    await client.post(
                        f"{SUPABASE_URL}/rest/v1/positions",
                        headers=get_headers(),
                        json=positions_data
                    )
            
            if state.portfolio.transactions:
                txs_data = []
                for tx in state.portfolio.transactions:
                    txs_data.append({
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "tx_id": tx.tx_id,
                        "date": tx.date,
                        "type": tx.type,
                        "asset_id": tx.asset_id,
                        "asset_type": tx.asset_type,
                        "quantity": tx.quantity,
                        "price": tx.price,
                        "cash_change": tx.cash_change
                    })
                if txs_data:
                    await client.post(
                        f"{SUPABASE_URL}/rest/v1/transactions",
                        headers=get_headers(),
                        json=txs_data
                    )
        
        if state.market:
            await client.delete(
                f"{SUPABASE_URL}/rest/v1/markets?user_id=eq.{user_id}",
                headers=get_headers()
            )
            
            market_data = []
            for asset in state.market:
                market_data.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "asset_id": asset.id,
                    "asset_type": asset.type,
                    "name": asset.name,
                    "sector": asset.sector,
                    "base_price": asset.basePrice,
                    "price": asset.price,
                    "volatility": asset.volatility,
                    "rate": asset.rate,
                    "tenure": asset.tenure,
                    "icon": asset.icon,
                    "description": asset.description
                })
            if market_data:
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/markets",
                    headers=get_headers(),
                    json=market_data
                )
    
    return {"success": True, "user_id": user_id}

@app.get("/sync/load/{user_id}")
async def sync_load(user_id: str):
    try:
        async with httpx.AsyncClient() as client:
            profile_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles?user_id=eq.{user_id}&select=*",
                headers=get_headers()
            )
            profiles = profile_resp.json()
            
            if not profiles or isinstance(profiles, dict):
                return JSONResponse(status_code=404, content={"error": "User not found"})
            
            profile_row = profiles[0]
            
            portfolio_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/portfolios?user_id=eq.{user_id}&select=*",
                headers=get_headers()
            )
            portfolios = portfolio_resp.json() if portfolio_resp.status_code == 200 else []
            
            positions_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/positions?user_id=eq.{user_id}&select=*",
                headers=get_headers()
            )
            positions = positions_resp.json() if positions_resp.status_code == 200 else []
            
            txs_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/transactions?user_id=eq.{user_id}&select=*&order=created_at.desc",
                headers=get_headers()
            )
            transactions = txs_resp.json() if txs_resp.status_code == 200 else []
            
            market_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/markets?user_id=eq.{user_id}&select=*",
                headers=get_headers()
            )
            market_rows = market_resp.json() if market_resp.status_code == 200 else []
        
        if isinstance(portfolios, dict):
            portfolios = []
        if isinstance(positions, dict):
            positions = []
        if isinstance(transactions, dict):
            transactions = []
        if isinstance(market_rows, dict):
            market_rows = []
        
        profile = {
            "user_id": profile_row["user_id"],
            "name": profile_row["name"],
            "income": profile_row["income"],
            "life_stage": profile_row["life_stage"],
            "knowledge_level": profile_row["knowledge_level"],
            "focus_goal": profile_row["focus_goal"],
            "balance": profile_row["balance"],
            "xp": profile_row["xp"],
            "level": profile_row["level"],
            "budget": profile_row.get("budget", {
                "month": 1,
                "allocated": False,
                "needs": 0,
                "wants": 0,
                "savings": 0,
                "needsRemaining": 0,
                "wantsRemaining": 0,
                "savingsRemaining": 0,
                "expensesPaid": [],
                "monthHistory": []
            })
        }
        
        portfolio = None
        if portfolios:
            p = portfolios[0]
            portfolio = {
                "cash": float(p["cash"]),
                "positions": [],
                "transactions": [],
                "market_scenario": p["market_scenario"],
                "investMonth": p["invest_month"],
                "startMonth": p["start_month"],
                "achievements": p.get("achievements", {})
            }
            
            for pos in positions:
                portfolio["positions"].append({
                    "id": pos["asset_id"],
                    "type": pos["asset_type"],
                    "name": pos["name"],
                    "quantity": float(pos["quantity"]),
                    "avg_price": float(pos["avg_price"]),
                    "current_price": float(pos["current_price"]),
                    "buy_month": pos.get("buy_month"),
                    "principal": float(pos["principal"]) if pos.get("principal") else None,
                    "rate": float(pos["rate"]) if pos.get("rate") else None,
                    "tenure": pos.get("tenure"),
                    "maturity_month": pos.get("maturity_month")
                })
            
            for tx in transactions:
                portfolio["transactions"].append({
                    "tx_id": tx["tx_id"],
                    "date": tx["date"],
                    "type": tx["type"],
                    "asset_id": tx["asset_id"],
                    "asset_type": tx["asset_type"],
                    "quantity": float(tx["quantity"]),
                    "price": float(tx["price"]),
                    "cash_change": float(tx["cash_change"])
                })
        
        market = None
        if market_rows:
            market = []
            for m in market_rows:
                market.append({
                    "id": m["asset_id"],
                    "type": m["asset_type"],
                    "name": m["name"],
                    "sector": m["sector"],
                    "basePrice": float(m["base_price"]) if m.get("base_price") else None,
                    "price": float(m["price"]),
                    "volatility": float(m["volatility"]) if m.get("volatility") else None,
                    "rate": float(m["rate"]) if m.get("rate") else None,
                    "tenure": m.get("tenure"),
                    "icon": m["icon"],
                    "description": m["description"]
                })
        
        return {
            "profile": profile,
            "portfolio": portfolio,
            "market": market
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "CSS")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "JS")), name="js")
app.mount("/html", StaticFiles(directory=os.path.join(FRONTEND_DIR, "HTML")), name="html")

@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "HTML", "index.html"))

@app.get("/onboarding")
async def serve_onboarding():
    return FileResponse(os.path.join(FRONTEND_DIR, "HTML", "onboarding.html"))

@app.get("/dashboard")
async def serve_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "HTML", "dashboard.html"))

@app.get("/investing")
async def serve_investing():
    return FileResponse(os.path.join(FRONTEND_DIR, "HTML", "investing.html"))

@app.get("/analytics")
async def serve_analytics():
    return FileResponse(os.path.join(FRONTEND_DIR, "HTML", "analytics.html"))

@app.get("/story")
async def serve_story():
    return FileResponse(os.path.join(FRONTEND_DIR, "HTML", "story.html"))
