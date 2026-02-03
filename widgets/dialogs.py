from PySide6.QtWidgets import QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton
from PySide6.QtCore import Qt
from config import COLORS


class NameInputDialog(QDialog):
    #Dialog for collecting student name before submission
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Xác nhận thông tin học sinh")
        self.setFixedSize(450, 250)
        self.setStyleSheet("background-color: white;")
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(30, 30, 30, 30)
        
        label = QLabel("HỌ VÀ TÊN HỌC SINH:")
        label.setStyleSheet("font-size: 14px; font-weight: bold; color: #2f3640;")
        layout.addWidget(label)
        
        self.name_edit = QLineEdit()
        self.name_edit.setPlaceholderText("Nhập đầy đủ họ tên của em...")
        self.name_edit.setStyleSheet(f"""
            QLineEdit {{
                padding: 12px; 
                font-size: 15px; 
                border: 2px solid {COLORS['primary']}; 
                border-radius: 8px; 
                color: #2f3640;
                background-color: #ffffff;
            }}
        """)
        layout.addWidget(self.name_edit)
        
        layout.addSpacing(10)
        
        self.btn_confirm = QPushButton("NỘP BÀI NGAY")
        self.btn_confirm.setCursor(Qt.PointingHandCursor)
        self.btn_confirm.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['success']}; 
                color: white; 
                padding: 12px; 
                font-size: 14px;
                font-weight: bold; 
                border-radius: 8px;
            }}
            QPushButton:hover {{ background-color: #2ecc71; }}
        """)
        self.btn_confirm.clicked.connect(self.accept)
        layout.addWidget(self.btn_confirm)

    def get_name(self):
        return self.name_edit.text().strip()
