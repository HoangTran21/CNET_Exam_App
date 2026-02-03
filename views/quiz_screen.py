import os
from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, QRadioButton, 
                             QPushButton, QButtonGroup, QMessageBox, QScrollArea, QFrame, QDialog)
from PySide6.QtCore import QTimer, Qt
from PySide6.QtGui import QFont
from config import COLORS, CODE_EDITOR_READONLY_STYLESHEET
from widgets import CodeEditor, NameInputDialog
from utils import DocumentExporter, BackupManager


class QuizScreen(QWidget):
    """Main quiz screen with questions and coding tasks."""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parent_window = parent
        self.answer_groups = []
        self.coding_editors = []
        self.time_left = 0
        self.is_submitted = False
        
    def setup_ui(self, quiz_data, filename=None):
        """Setup quiz interface with data."""
        self.quiz_title = quiz_data.get("title", "BaiTap")
        self.questions = quiz_data.get("questions", [])
        tasks = quiz_data.get("coding_tasks", quiz_data.get("coding_task", []))
        self.coding_tasks = tasks if isinstance(tasks, list) else [tasks]
        self.time_left = quiz_data.get("time_seconds", 900)
        self.quiz_filename = filename
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 10, 20, 20)

        # Timer
        timer_container = QWidget()
        timer_container.setStyleSheet(f"background-color: white; border-radius: 10px; border: 1px solid {COLORS['border']};")
        timer_lay = QHBoxLayout(timer_container)
        self.label_timer = QLabel(self._format_time(self.time_left))
        self.label_timer.setAlignment(Qt.AlignCenter)
        self.label_timer.setStyleSheet(f"font-size: 20px; font-weight: bold; color: {COLORS['danger']}; border: none;")
        timer_lay.addWidget(self.label_timer)
        layout.addWidget(timer_container)

        # Content scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        content_container = QWidget()
        content_container.setObjectName("content_container")
        self.content_layout = QVBoxLayout(content_container)
        self.content_layout.setContentsMargins(30, 20, 30, 20)

        # Multiple choice section
        title_q = QLabel("I. PHẦN TRẮC NGHIỆM")
        title_q.setStyleSheet(f"font-size: 18px; font-weight: bold; color: {COLORS['accent']}; margin-bottom: 10px;")
        self.content_layout.addWidget(title_q)
        
        self.answer_groups = []
        for i, q in enumerate(self.questions):
            q_box = QWidget()
            q_lay = QVBoxLayout(q_box)
            lbl = QLabel(f"Câu {i+1}: {q['q']}")
            lbl.setWordWrap(True)
            lbl.setStyleSheet(f"font-weight: bold; font-size: 14px; color: {COLORS['dark']};")
            q_lay.addWidget(lbl)
            
            group = QButtonGroup(self)
            self.answer_groups.append(group)
            for idx, opt in enumerate(q['opts']):
                rb = QRadioButton(opt)
                group.addButton(rb, idx)
                q_lay.addWidget(rb)
            self.content_layout.addWidget(q_box)
            
            line = QFrame()
            line.setFrameShape(QFrame.HLine)
            line.setStyleSheet("color: #f1f2f6;")
            self.content_layout.addWidget(line)

        # Coding section
        title_c = QLabel("II. PHẦN TỰ LUẬN (CODE)")
        title_c.setStyleSheet(f"font-size: 18px; font-weight: bold; color: {COLORS['accent']}; margin-top: 20px; margin-bottom: 10px;")
        self.content_layout.addWidget(title_c)
        
        self.coding_editors = []
        for i, task in enumerate(self.coding_tasks):
            self.content_layout.addWidget(
                QLabel(f"<b>Bài tập {i+1}:</b> <i style='color: #7f8c8d;'>{task}</i>")
            )
            editor = CodeEditor(f"# Lời giải cho bài tập {i+1}...")
            self.coding_editors.append(editor)
            self.content_layout.addWidget(editor)

        scroll.setWidget(content_container)
        layout.addWidget(scroll)

        btn_layout = QHBoxLayout()
        self.btn_back = QPushButton("◀ QUAY LẠI")
        self.btn_back.setStyleSheet(f"height: 55px; background-color: #95a5a6; font-size: 15px;")
        self.btn_back.clicked.connect(self.on_back_clicked)
        
        self.btn_submit = QPushButton("NỘP BÀI")
        self.btn_submit.setStyleSheet(f"height: 55px; background-color: {COLORS['success']}; font-size: 16px;")
        self.btn_submit.clicked.connect(self.on_submit_clicked)
        
        self.btn_export = QPushButton("XUẤT BẢN SAO LƯU (WORD)")
        self.btn_export.setEnabled(False)
        self.btn_export.setStyleSheet(f"height: 55px; background-color: {COLORS['primary']}; font-size: 15px;")
        self.btn_export.clicked.connect(self.on_export_clicked)
        
        btn_layout.addWidget(self.btn_back, 1)
        btn_layout.addWidget(self.btn_submit, 2)
        btn_layout.addWidget(self.btn_export, 1)
        layout.addLayout(btn_layout)

        # Setup timer
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.update_timer)
        self.timer.start(1000)
        
        # Setup autosave
        self.setup_autosave()

    def setup_autosave(self):
        #Setup automatic backup timer
        self.autosave_timer = QTimer(self)
        self.autosave_timer.timeout.connect(self.do_autosave)
        self.autosave_timer.start(30000)  # 30 seconds

    def do_autosave(self):
        if self.is_submitted or not hasattr(self, 'questions'):
            return
        
        answers = [g.checkedId() for g in self.answer_groups]
        coding = [ed.toPlainText() for ed in self.coding_editors]
        student_name = getattr(self.parent_window, 'student_name', '')
        filename = getattr(self, 'quiz_filename', None)
        
        BackupManager.save_backup(student_name, answers, coding, self.time_left, filename)

    def _format_time(self, seconds):
        return f"⏱ THỜI GIAN CÒN LẠI: {seconds//60:02d}:{seconds%60:02d}"

    def update_timer(self):
        if self.time_left > 0:
            self.time_left -= 1
            self.label_timer.setText(self._format_time(self.time_left))
            if self.time_left <= 60:
                self.label_timer.setStyleSheet(f"font-size: 20px; font-weight: bold; color: red; background: #ffeaa7;")
        else:
            self.submit_quiz(auto=True)

    def on_back_clicked(self):
        """Handle back button click to return to selection screen."""
        if self.is_submitted:
            self.parent_window.show_selection_screen()
            return
        
        msg_box = QMessageBox(self.parent_window)
        msg_box.setWindowTitle("Quay lại màn hình chính")
        msg_box.setIcon(QMessageBox.Warning)
        msg_box.setText("<b style='font-size: 15px; color: #c0392b;'>BẠN CÓ CHẮC MUỐN QUAY LẠI?</b>")
        msg_box.setInformativeText("Nếu quay lại bây giờ, toàn bộ bài làm của em sẽ bị mất.")
        
        btn_confirm = msg_box.addButton("Quay lại", QMessageBox.DestructiveRole)
        btn_cancel = msg_box.addButton("Tiếp tục làm bài", QMessageBox.AcceptRole)
        
        btn_confirm.setStyleSheet(f"background-color: {COLORS['danger']}; color: white; font-weight: bold;")
        btn_cancel.setStyleSheet(f"background-color: {COLORS['success']}; color: white; font-weight: bold;")
        
        msg_box.exec()
        
        if msg_box.clickedButton() == btn_confirm:
            BackupManager.delete_backup()
            self.parent_window.show_selection_screen()

    def on_submit_clicked(self):
        if self.is_submitted:
            self.parent_window.show_selection_screen()
            return

        msg_box = QMessageBox(self.parent_window)
        msg_box.setWindowTitle("Xác nhận")
        msg_box.setIcon(QMessageBox.Question)
        msg_box.setText("<b style='font-size: 16px; color: #2c3e50;'>XÁC NHẬN NỘP BÀI KIỂM TRA?</b>")
        msg_box.setInformativeText("Sau khi nhấn 'Có', em sẽ không thể sửa bài làm nữa.")
        confirm_button = msg_box.addButton("Có, nộp bài", QMessageBox.YesRole)
        cancel_button = msg_box.addButton("Quay lại", QMessageBox.NoRole)
        confirm_button.setStyleSheet(f"background-color: {COLORS['success']}; color: white; font-weight: bold;")
        cancel_button.setStyleSheet(f"background-color: {COLORS['danger']}; color: white; font-weight: bold;")
        msg_box.exec()
        
        if msg_box.clickedButton() == confirm_button:
            self.submit_quiz()

    def submit_quiz(self, auto=False):
        if self.is_submitted:
            return

        # Get student name
        if auto:
            self.parent_window.student_name = ""
            while not self.parent_window.student_name:
                dialog = NameInputDialog(self.parent_window)
                dialog.setWindowTitle("HẾT GIỜ! VUI LÒNG NHẬP TÊN")
                dialog.setWindowFlags(dialog.windowFlags() | Qt.CustomizeWindowHint)
                dialog.setWindowFlags(dialog.windowFlags() & ~Qt.WindowCloseButtonHint)
                
                if dialog.exec() == QDialog.Accepted:
                    self.parent_window.student_name = dialog.get_name()
                    if not self.parent_window.student_name:
                        QMessageBox.warning(self.parent_window, "Chú ý", "Em không được để trống họ tên!")
                else:
                    QMessageBox.warning(self.parent_window, "Bắt buộc", "Hết giờ làm bài, em phải nhập tên để nộp bài!")
        else:
            dialog = NameInputDialog(self.parent_window)
            if dialog.exec() != QDialog.Accepted:
                return
            self.parent_window.student_name = dialog.get_name()
            if not self.parent_window.student_name:
                self.parent_window.student_name = "Học sinh ẩn danh"

        self.is_submitted = True
        self.timer.stop()
        self.autosave_timer.stop()
        
        # Disable editing
        for group in self.answer_groups:
            for btn in group.buttons():
                btn.setEnabled(False)
        for editor in self.coding_editors:
            editor.setReadOnly(True)
            editor.setStyleSheet(CODE_EDITOR_READONLY_STYLESHEET)

        self.btn_submit.setText("QUAY LẠI TRANG CHỦ")
        self.btn_submit.setStyleSheet(f"height: 55px; background-color: #2ecc71; font-size: 16px;")
        self.btn_export.setEnabled(True)
        self.btn_export.setStyleSheet(f"height: 55px; background-color: {COLORS['primary']}; font-size: 15px; border-radius: 8px;")
        
        # Calculate score
        correct = sum(1 for i, g in enumerate(self.answer_groups) if g.checkedId() == self.questions[i]['ans'])
        score = (correct / len(self.questions)) * 10 if self.questions else 0
        
        # Generate document
        self.generate_document(save_locally=False)
        
        # Show result dialog
        student_answers = [g.checkedId() for g in self.answer_groups]
        self.show_result_dialog(auto, score, student_answers)
        
        # Cleanup backup
        BackupManager.delete_backup()

    def show_result_dialog(self, auto, score, student_answers):
        res_box = QMessageBox(self.parent_window)
        res_box.setWindowTitle("Kết quả bài thi")
        status_msg = "Thời gian đã hết!" if auto else "Nộp bài thành công!"
        
        res_box.setText(
            f"<div style='text-align: center;'>"
            f"<b style='font-size: 18px; color: {COLORS['danger']};'>{status_msg}</b><br>"
            f"<b style='font-size: 20px; color: {COLORS['accent']};'>Học sinh: {self.parent_window.student_name}</b>"
            f"</div>"
        )
        
        res_box.setInformativeText(f"""
            <div style='text-align: center; font-size: 16px; color: {COLORS['dark']};'>
                <p style='font-size: 22px;'>Điểm trắc nghiệm: <span style='color: #e67e22; font-weight: bold;'>{score:.2f}/10</span></p>
                <p style='color: #7f8c8d; font-size: 13px;'>Em có thể xem lại các câu đúng/sai bằng nút bên dưới.</p>
            </div>
        """)
        
        btn_review = res_box.addButton("XEM ĐÁP ÁN", QMessageBox.ActionRole)
        btn_review.setStyleSheet(f"background-color: #9b59b6; color: white; padding: 10px; font-weight: bold;")
        btn_close = res_box.addButton("ĐÓNG", QMessageBox.AcceptRole)
        btn_close.setStyleSheet(f"background-color: {COLORS['primary']}; color: white; padding: 10px; font-weight: bold;")
        
        res_box.exec()
        
        if res_box.clickedButton() == btn_review:
            from .review_dialog import ReviewDialog
            review_window = ReviewDialog(self.questions, student_answers, self.parent_window)
            review_window.exec()

    def on_export_clicked(self):
        success, message = self.generate_document(save_locally=True)
        if success:
            QMessageBox.information(self.parent_window, "Thành công", f"Đã lưu bản sao tại: {message}")
        else:
            QMessageBox.critical(self.parent_window, "Lỗi", message)

    def generate_document(self, save_locally=False):
        #Generate and save Word document
        doc = DocumentExporter.generate_document(
            self.quiz_title,
            self.parent_window.student_name,
            self.questions,
            [g.checkedId() for g in self.answer_groups],
            self.coding_tasks,
            [ed.toPlainText() for ed in self.coding_editors]
        )
        
        if save_locally:
            return DocumentExporter.save_document_locally(doc, self.quiz_title, self.parent_window.student_name)
        else:
            return DocumentExporter.save_document_to_network(doc, self.quiz_title, self.parent_window.student_name)
