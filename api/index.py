import sys
from pathlib import Path

# Add the backend directory to Python path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent / "fake_news_detector"))

from main import app
