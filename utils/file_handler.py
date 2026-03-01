import os
import json
from config import BACKUP_FILE, DATA_FOLDER


class FileHandler:
    @staticmethod
    def load_quiz_data(filename):
        path = os.path.join(DATA_FOLDER, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise Exception(f"Không thể tải dữ liệu: {str(e)}")
    
    @staticmethod
    def get_available_modules():
        modules = {}
        if os.path.exists(DATA_FOLDER):
            files = sorted(
                [f for f in os.listdir(DATA_FOLDER) if f.endswith(".json")],
                key=lambda name: name.casefold()
            )
            for f in files:
                pretty_name = os.path.splitext(f)[0]
                if pretty_name.lower().startswith("module"):
                    suffix = pretty_name[6:].strip()
                    pretty_name = f"Module {suffix}" if suffix else "Module"
                display_name = f"📝 Đề thi {pretty_name}"
                modules[display_name] = f
        return modules


class BackupManager:
    #Save and load quiz progress backups.
    @staticmethod
    def save_backup(student_name, answers, coding, time_left, filename=None):
        backup_data = {
            "student_name": student_name,
            "answers": answers,
            "coding": coding,
            "time_left": time_left,
            "filename": filename
        }
        
        try:
            with open(BACKUP_FILE, "w", encoding="utf-8") as f:
                json.dump(backup_data, f, ensure_ascii=False)
        except Exception:
            pass
    
    @staticmethod
    def load_backup():
        if os.path.exists(BACKUP_FILE):
            try:
                with open(BACKUP_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return None
        return None
    
    @staticmethod
    def has_backup():
        return os.path.exists(BACKUP_FILE)
    
    @staticmethod
    def delete_backup():
        if os.path.exists(BACKUP_FILE):
            try:
                os.remove(BACKUP_FILE)
            except Exception:
                pass
