import os
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QComboBox, QPushButton
from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap, QIcon
from config import COLORS
from utils import FileHandler, ResourceManager


class SelectionScreen(QWidget):
    #Module selection screen for choosing quiz module
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent_window = parent
        self.module_mapping = {}
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(15)

        # Logo
        logo_label = QLabel()
        logo_pixmap = QPixmap(ResourceManager.get_logo_path())
        if not logo_pixmap.isNull():
            logo_label.setPixmap(
                logo_pixmap.scaled(200, 200, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            )
        else:
            logo_label.setText("🏫")
            logo_label.setStyleSheet("font-size: 80px;")
        layout.addWidget(logo_label, alignment=Qt.AlignCenter)

        title = QLabel("HỆ THỐNG BÀI TẬP")
        title.setStyleSheet(f"font-size: 28px; font-weight: bold; color: {COLORS['accent']}; margin-top: 10px;")
        layout.addWidget(title, alignment=Qt.AlignCenter)

        self.combo_modules = QComboBox()
        self.combo_modules.setFixedWidth(450)
        self.module_mapping = FileHandler.get_available_modules()
        
        if self.module_mapping:
            for display_name in self.module_mapping.keys():
                self.combo_modules.addItem(display_name)
        else:
            self.combo_modules.addItem("Chưa có dữ liệu bài tập (.json)")
        
        layout.addWidget(self.combo_modules, alignment=Qt.AlignCenter)
        layout.addSpacing(20)
        
        btn_start = QPushButton("BẮT ĐẦU LÀM BÀI")
        btn_start.setFixedSize(250, 55)
        btn_start.setStyleSheet(f"""
            QPushButton {{ 
                background-color: {COLORS['primary']}; 
                font-size: 16px; 
                border-bottom: 4px solid {COLORS['accent']}; 
            }}
            QPushButton:hover {{ 
                background-color: {COLORS['accent']}; 
            }}
            QPushButton:pressed {{ 
                border-bottom: 0px; 
                margin-top: 4px; 
            }}
        """)
        btn_start.clicked.connect(self.on_start_clicked)
        layout.addWidget(btn_start, alignment=Qt.AlignCenter)

    def on_start_clicked(self):
        display_name = self.combo_modules.currentText()
        filename = self.module_mapping.get(display_name)
        if filename and self.parent_window:
            self.parent_window.load_and_start_quiz(filename)
