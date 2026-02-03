from PySide6.QtWidgets import QPlainTextEdit
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont
from config import CODE_EDITOR_STYLESHEET


class CodeEditor(QPlainTextEdit):
    #Code editor for writing code solutions
    
    def __init__(self, placeholder="# Viết lời giải tại đây..."):
        super().__init__()
        self.setFont(QFont("Courier New", 11))
        self.setPlaceholderText(placeholder)
        self.setStyleSheet(CODE_EDITOR_STYLESHEET)
        self.setMinimumHeight(300)

    def keyPressEvent(self, event):
        """Handle key press events for indentation and tab support."""
        if event.key() in (Qt.Key_Return, Qt.Key_Enter):
            cursor = self.textCursor()
            line_text = cursor.block().text()
            indent = len(line_text) - len(line_text.lstrip())
            if line_text.strip().endswith(':'):
                indent += 4
            super().keyPressEvent(event)
            self.insertPlainText(" " * indent)
        elif event.key() == Qt.Key_Tab:
            self.insertPlainText("    ")
        else:
            super().keyPressEvent(event)
