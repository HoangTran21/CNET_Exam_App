import os
import sys


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


class ResourceManager:
    #Manage application resources like images and icons.
    
    @staticmethod
    def get_logo_path():
        return resource_path("logo.png")
    
    @staticmethod
    def get_icon_path():
        return resource_path("logo_cnet.ico")
    
    @staticmethod
    def logo_exists():
        return os.path.exists(ResourceManager.get_logo_path())
    
    @staticmethod
    def icon_exists():
        return os.path.exists(ResourceManager.get_icon_path())
