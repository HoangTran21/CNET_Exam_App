import sys
import os
from PySide6.QtWidgets import QApplication, QMainWindow, QMessageBox
from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon

from config import (
    APP_TITLE, APP_WIDTH, APP_HEIGHT, GLOBAL_STYLESHEET
)
from utils import FileHandler, BackupManager, ResourceManager
from views import SelectionScreen, QuizScreen


class QuizApp(QMainWindow):
    """Main application window for the exam system."""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle(APP_TITLE)
        self.resize(APP_WIDTH, APP_HEIGHT)
        
        self.is_submitted = False
        self.student_name = ""
        self.current_quiz_screen = None
        
        self.apply_global_styles()
        self.center_on_screen()
        
        self.show_selection_screen()
        
        self.check_for_backup()

    def apply_global_styles(self):
        self.setStyleSheet(GLOBAL_STYLESHEET)
        
        icon_path = ResourceManager.get_icon_path()
        if ResourceManager.icon_exists():
            self.setWindowIcon(QIcon(icon_path))

    def center_on_screen(self):
        screen = QApplication.primaryScreen().availableGeometry()
        size = self.frameGeometry()
        self.move(
            (screen.width() - size.width()) // 2,
            (screen.height() - size.height()) // 2
        )

    def show_selection_screen(self):
        self.is_submitted = False
        self.student_name = ""
        
        selection_widget = SelectionScreen(parent=self)
        selection_widget.setup_ui()
        self.setCentralWidget(selection_widget)

    def load_and_start_quiz(self, filename):
        try:
            quiz_data = FileHandler.load_quiz_data(filename)
            self.init_quiz_screen(quiz_data, filename)
        except Exception as e:
            QMessageBox.critical(self, "Lỗi", f"Không thể khởi tạo bài tập!\n{str(e)}")

    def init_quiz_screen(self, quiz_data, filename=None):
        self.current_quiz_screen = QuizScreen(parent=self)
        self.current_quiz_screen.setup_ui(quiz_data, filename)
        self.setCentralWidget(self.current_quiz_screen)

    def check_for_backup(self):
        # Check if there's a backup to restore
        if BackupManager.has_backup():
            response = QMessageBox.question(
                self,
                "Khôi phục",
                "Tìm thấy bài làm chưa hoàn thành, khôi phục chứ?",
                QMessageBox.Yes | QMessageBox.No
            )
            if response == QMessageBox.Yes:
                self.restore_backup()

    def restore_backup(self):
        # Restore quiz state from backup file
        backup_data = BackupManager.load_backup()
        if not backup_data:
            return

        try:
            filename = backup_data.get("filename")
            if not filename:
                return
            
            # Load the quiz
            quiz_data = FileHandler.load_quiz_data(filename)
            self.init_quiz_screen(quiz_data, filename)
            
            # Restore student name and time
            self.student_name = backup_data.get("student_name", "")
            self.current_quiz_screen.time_left = backup_data.get("time_left", 900)
            
            # Restore answers
            answers = backup_data.get("answers", [])
            for i, ans_id in enumerate(answers):
                if ans_id != -1 and i < len(self.current_quiz_screen.answer_groups):
                    self.current_quiz_screen.answer_groups[i].button(ans_id).setChecked(True)
            
            # Restore coding
            coding = backup_data.get("coding", [])
            for i, text in enumerate(coding):
                if i < len(self.current_quiz_screen.coding_editors):
                    self.current_quiz_screen.coding_editors[i].setPlainText(text)
                    
        except Exception:
            pass

    def closeEvent(self, event):
        """Handle window close event."""
        if self.is_submitted:
            event.accept()
            return
        
        if not self.current_quiz_screen or not hasattr(self.current_quiz_screen, 'questions'):
            event.accept()
            return
        
        msg_box = QMessageBox(self)
        msg_box.setWindowTitle("Cảnh báo thoát ứng dụng")
        msg_box.setIcon(QMessageBox.Warning)
        msg_box.setText(
            "<b style='font-size: 15px; color: #c0392b;'>EM CÓ CHẮC CHẮN MUỐN THOÁT KHÔNG?</b>"
        )
        msg_box.setInformativeText(
            "Nếu thoát bây giờ, toàn bộ bài làm của em sẽ bị mất và không được ghi nhận."
        )
        
        btn_exit = msg_box.addButton("Thoát (Hủy bài)", QMessageBox.DestructiveRole)
        btn_stay = msg_box.addButton("Quay lại làm tiếp", QMessageBox.AcceptRole)
        
        btn_exit.setStyleSheet("background-color: #e74c3c; color: white; font-weight: bold; min-width: 100px;")
        btn_stay.setStyleSheet("background-color: #27ae60; color: white; font-weight: bold; min-width: 100px;")
        
        msg_box.exec()
        
        if msg_box.clickedButton() == btn_stay:
            event.ignore()
        else:
            event.accept()


def main():
    """Application entry point."""
    app = QApplication(sys.argv)
    window = QuizApp()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
