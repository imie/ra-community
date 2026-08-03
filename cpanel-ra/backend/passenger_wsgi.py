import sys
import os

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables if .env exists (cPanel might not auto-load it)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from a2wsgi import ASGIMiddleware
from app.main import app

# cPanel/Phusion Passenger looks for a WSGI callable named 'application'.
# Since FastAPI is an ASGI framework, we wrap it using a2wsgi to make it WSGI compatible.
application = ASGIMiddleware(app)
