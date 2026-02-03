from PySide6.QtWidgets import (QDialog, QVBoxLayout, QLabel, QScrollArea, 
                             QWidget, QFrame, QPushButton)
from PySide6.QtCore import Qt
from config import COLORS


class ReviewDialog(QDialog):
    #Review quiz results
    
    def __init__(self, questions, student_answers, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Xem lại kết quả trắc nghiệm")
        self.resize(900, 750)
        self.setStyleSheet(f"background-color: {COLORS['light']};")
        
        layout = QVBoxLayout(self)
        
        # Title
        title = QLabel("CHI TIẾT ĐÁP ÁN TRẮC NGHIỆM")
        title.setStyleSheet(f"font-size: 20px; font-weight: bold; color: {COLORS['accent']}; margin-bottom: 10px;")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # Content scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("border: none; background-color: transparent;")
        
        content = QWidget()
        content_layout = QVBoxLayout(content)
        
        for i, q in enumerate(questions):
            q_box = QFrame()
            
            student_choice = student_answers[i]
            correct_choice = q['ans']
            is_correct = (student_choice == correct_choice)
            
            bg_color = "#eafaf1" if is_correct else "#fdedec"
            border_color = "#2ecc71" if is_correct else COLORS['danger']
            
            q_box.setStyleSheet(f"""
                QFrame {{
                    background-color: {bg_color};
                    border: 2px solid {border_color};
                    border-radius: 10px;
                    padding: 15px;
                    margin-bottom: 10px;
                }}
            """)
            
            box_layout = QVBoxLayout(q_box)
            
            lbl_q = QLabel(f"Câu {i+1}: {q['q']}")
            lbl_q.setWordWrap(True)
            lbl_q.setStyleSheet(f"font-weight: bold; font-size: 14px; border: none; color: #2c3e50;")
            box_layout.addWidget(lbl_q)
            
            ans_text = q['opts'][student_choice] if student_choice != -1 else "Không trả lời"
            correct_text = q['opts'][correct_choice]
            
            status_text = (
                "<b>KẾT QUẢ: ĐÚNG</b>" 
                if is_correct 
                else f"<b>KẾT QUẢ: SAI</b> (Đáp án đúng: <span style='color: #27ae60;'>{correct_text}</span>)"
            )
            
            lbl_res = QLabel(f"Em chọn: {ans_text}<br>{status_text}")
            lbl_res.setStyleSheet(f"font-size: 13px; border: none; color: #34495e;")
            box_layout.addWidget(lbl_res)
            
            content_layout.addWidget(q_box)

        scroll.setWidget(content)
        layout.addWidget(scroll)
        
        btn_close = QPushButton("ĐÓNG")
        btn_close.setFixedSize(120, 40)
        btn_close.setCursor(Qt.PointingHandCursor)
        btn_close.setStyleSheet(f"background-color: #34495e; color: white; font-weight: bold; border-radius: 5px;")
        btn_close.clicked.connect(self.accept)
        layout.addWidget(btn_close, alignment=Qt.AlignCenter)
