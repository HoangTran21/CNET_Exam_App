# Configuration and Constants
import os

# Application Settings
APP_TITLE = "Hệ thống Kiểm tra Lập trình"
APP_WIDTH = 1200
APP_HEIGHT = 750
DEFAULT_TIME_SECONDS = 900  # 15 minutes
DATA_FOLDER = "data"
BACKUP_FILE = "temp_backup.json"
AUTOSAVE_INTERVAL = 30000  # 30 seconds in milliseconds

# Network Settings
SERVER_IP = "192.168.1.60"
SHARE_NAME = "KET_QUA_THI"
NETWORK_PATH = f"//{SERVER_IP}/{SHARE_NAME}"

# Color Scheme
COLORS = {
    "primary": "#3498db",
    "success": "#27ae60",
    "danger": "#e74c3c",
    "warning": "#f39c12",
    "light": "#f5f6fa",
    "dark": "#2f3640",
    "text": "#34495e",
    "border": "#dcdde1",
    "accent": "#2980b9",
}

# Fonts
FONTS = {
    "title": ("Segoe UI", 28, "bold"),
    "heading": ("Segoe UI", 18, "bold"),
    "normal": ("Segoe UI", 14),
    "small": ("Segoe UI", 13),
    "code": ("Courier New", 11),
}

# Styles
GLOBAL_STYLESHEET = f"""
    QMainWindow {{ background-color: {COLORS['light']}; }}
    QLabel {{ color: {COLORS['dark']}; font-family: 'Segoe UI'; }}
    QWidget#content_container {{ 
        background-color: white; 
        border-radius: 12px; 
        border: 1px solid {COLORS['border']}; 
    }}
    QRadioButton {{ 
        color: #353b48; 
        padding: 8px; 
        font-size: 13px; 
    }}
    QRadioButton:hover {{ 
        background-color: #f1f2f6; 
        border-radius: 5px; 
    }}
    QPushButton {{ 
        border-radius: 8px; 
        color: white; 
        font-weight: bold; 
        font-family: 'Segoe UI'; 
    }}
    QComboBox {{ 
        background-color: white; 
        color: {COLORS['dark']}; 
        border: 1px solid {COLORS['border']}; 
        padding: 8px; 
        border-radius: 6px;
        font-size: 14px;
    }}
    QScrollArea {{ 
        border: none; 
        background-color: transparent; 
    }}
    QMessageBox {{ 
        background-color: #ffffff; 
    }}
    QMessageBox QLabel {{ 
        color: {COLORS['dark']}; 
        font-size: 14px; 
    }}
    QMessageBox QPushButton {{ 
        background-color: {COLORS['primary']}; 
        color: white; 
        padding: 6px 15px; 
        min-width: 80px; 
    }}
"""

CODE_EDITOR_STYLESHEET = """
    QPlainTextEdit {
        background-color: #282c34; 
        color: #abb2bf; 
        border: 1px solid #dcdde1;
        border-radius: 8px; 
        padding: 10px;
        margin-bottom: 20px;
    }
"""

CODE_EDITOR_READONLY_STYLESHEET = """
    QPlainTextEdit {
        background-color: #1e2127; 
        color: #abb2bf; 
        border: 1px solid #dcdde1;
        border-radius: 8px; 
        padding: 10px;
        margin-bottom: 20px;
    }
"""

def resource_path(relative_path):
    import sys
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)
