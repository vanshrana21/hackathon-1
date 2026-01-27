from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from supabase import Client
from supabase._sync.client import SyncClient
from dotenv import load_dotenv
import os
import httpx

load_dotenv()

app = FastAPI(title="Financial Literacy Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_supabase_client: Client | None = None

def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        _supabase_client = SyncClient(url, key)
    return _supabase_client

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "Frontend")

INCOME_BY_LIFE_STAGE = {
    "Student": 15000,
    "Just Started Working": 30000,
    "Young Professional": 50000,
    "Independent Adult": 75000
}

class OnboardingData(BaseModel):
    name: str
    knowledge_level: str
    life_stage: str
    goal: str

class UserResponse(BaseModel):
    id: str
    name: str
    knowledge_level: str
    life_stage: str
    goal: str
    monthly_income: int
    virtual_balance: int
    xp: int
    current_level: int

@app.post("/users/onboard", response_model=UserResponse)
async def onboard_user(data: OnboardingData):
    monthly_income = INCOME_BY_LIFE_STAGE.get(data.life_stage, 30000)
    
    user_data = {
        "name": data.name,
        "knowledge_level": data.knowledge_level,
        "life_stage": data.life_stage,
        "goal": data.goal,
        "monthly_income": monthly_income,
        "virtual_balance": 100000,
        "xp": 50,
        "current_level": 1
    }
    
    result = get_supabase().table("users").insert(user_data).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    user = result.data[0]
    return UserResponse(
        id=user["id"],
        name=user["name"],
        knowledge_level=user["knowledge_level"],
        life_stage=user["life_stage"],
        goal=user["goal"],
        monthly_income=user["monthly_income"],
        virtual_balance=user["virtual_balance"],
        xp=user["xp"],
        current_level=user["current_level"]
    )

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    result = get_supabase().table("users").select("*").eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data[0]
    return UserResponse(
        id=user["id"],
        name=user["name"],
        knowledge_level=user["knowledge_level"],
        life_stage=user["life_stage"],
        goal=user["goal"],
        monthly_income=user["monthly_income"],
        virtual_balance=user["virtual_balance"],
        xp=user["xp"],
        current_level=user["current_level"]
    )

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
