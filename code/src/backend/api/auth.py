from fastapi import APIRouter, HTTPException
from utils.token_and_password import hash_password, verify_password, create_access_token
from database.connection import get_connection
from models.register import RegisterRequest
from models.login import LoginRequest

router = APIRouter()

@router.post("/register")
def register_user(data: RegisterRequest):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = %s", (data.email,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = hash_password(data.password)
    cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id", (data.email, password_hash))
    user_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    
    token = create_access_token({"sub": str(user_id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login")
def login_user(data: LoginRequest):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (data.email,))
    result = cur.fetchone()
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id, password_hash = result
    if not verify_password(data.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user_id)})
    return {"access_token": token, "token_type": "bearer"}