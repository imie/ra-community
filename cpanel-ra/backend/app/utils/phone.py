import re
from typing import Optional

def normalize_phone_number(phone: Optional[str]) -> Optional[str]:
    """
    Auto add country code +6 for any number starting with 0.
    e.g. 0123456789 -> +60123456789
    If it already starts with +6, leave it as is.
    Removes any spaces or hyphens before storing.
    """
    if not phone:
        return phone
    
    # Strip all non-digit and non-plus characters
    cleaned = re.sub(r'[^\d+]', '', phone.strip())
    
    if cleaned.startswith('0'):
        # Add +6
        cleaned = '+6' + cleaned
        
    return cleaned
