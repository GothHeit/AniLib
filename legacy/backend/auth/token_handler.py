from fastapi import HTTPException, Header
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY =os.getenv("JWT_SECRET")

ALGORITHM = "HS256"



def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(hours=1)

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def verify_token(authorization: str = Header()):
   
    try:
        token = authorization.replace("Bearer ","")
        data = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        
        return data

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido"
        )