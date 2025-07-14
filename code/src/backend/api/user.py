from fastapi import APIRouter, Depends
from auth.dependecies import get_current_user

router = APIRouter()

@router.get("/check")
def check_authentication(user: str = Depends(get_current_user)):
    """Simply checks if the JWT is valid. 
    If it's invalid, 401 is raised automatically by `get_current_user`. 
    If it's valid, we just return 200 with a simple message."""
    return {"detail": "User is authenticated"}