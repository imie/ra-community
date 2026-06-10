"""
Shared types for all applications
"""

# User roles
class UserRole:
    RESIDENT = "resident"
    COMMITTEE = "committee"
    ADMIN = "admin"

# User status
class UserStatus:
    PENDING = "pending"
    VERIFIED = "verified"
    SUSPENDED = "suspended"
    DELETED = "deleted"

# Marital status
class MaritalStatus:
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"

# Sex
class Sex:
    MALE = "M"
    FEMALE = "F"

# Database transaction limits (for pagination)
PAGINATION_LIMIT_MIN = 1
PAGINATION_LIMIT_MAX = 100
PAGINATION_LIMIT_DEFAULT = 20
