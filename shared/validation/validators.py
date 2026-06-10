"""
Shared validation utilities
"""
import re
from datetime import datetime

def validate_ic_number(ic_number: str) -> bool:
    """Validate Malaysian IC number format"""
    # Malaysian IC format: YYMMDD-PB-000G
    pattern = r'^\d{6}-\d{2}-\d{4}$'
    return bool(re.match(pattern, ic_number))

def validate_phone_number(phone_number: str) -> bool:
    """Validate phone number format"""
    # Simple validation for phone numbers
    pattern = r'^\+?1?\d{9,15}$'
    return bool(re.match(pattern, phone_number))

def validate_password_strength(password: str) -> dict:
    """Validate password strength
    
    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    issues = []
    
    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
    if not re.search(r'\d', password):
        issues.append("Password must contain at least one digit")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        issues.append("Password must contain at least one special character")
    
    return {
        "is_valid": len(issues) == 0,
        "issues": issues
    }
