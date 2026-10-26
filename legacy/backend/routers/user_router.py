from fastapi import APIRouter, Depends
from auth.token_handler import verify_token
from services.user_service import get_users, create_user, login
from model.user_model import User

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("")
async def users(data= Depends(verify_token)):
    return await get_users()

@router.post("")
async def create_users(user: User):
    return await create_user(user) 

@router.post("/login")
async def login1(user: User):
    return await login(user)
    