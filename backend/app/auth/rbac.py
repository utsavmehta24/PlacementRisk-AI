"""Role-Based Access Control (RBAC)"""
from fastapi import HTTPException, status, Depends
from app.models.schemas import User
from app.auth.jwt import get_current_user


class RoleChecker:
    """Dependency for checking user roles"""
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(self.allowed_roles)}"
            )
        return user


# Pre-defined role checkers
require_admin = RoleChecker(["admin"])
require_risk_head = RoleChecker(["admin", "risk_head"])
require_loan_officer = RoleChecker(["admin", "risk_head", "loan_officer"])
require_student = RoleChecker(["student"])
require_officer = RoleChecker(["risk_head", "loan_officer"])
