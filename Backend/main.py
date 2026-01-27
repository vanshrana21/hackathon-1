from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
import os

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

@app.post("/users/onboard")
async def onboard_user(data: OnboardingData):
    if not data.name or not data.knowledge_level or not data.life_stage or not data.primary_goal:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid onboarding data"}
        )
    
    income = INCOME_BY_LIFE_STAGE.get(data.life_stage, 15000)
    xp = XP_BY_KNOWLEDGE.get(data.knowledge_level, 50)
    
    profile = {
        "name": data.name,
        "balance": 100000,
        "income": income,
        "xp": xp,
        "level": 1,
        "focus_goal": data.primary_goal,
        "knowledge_level": data.knowledge_level,
        "life_stage": data.life_stage
    }
    
    return profile

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
