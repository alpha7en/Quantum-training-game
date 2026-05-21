import cv2
import numpy as np
from PIL import Image
import subprocess
import os

# We can use opencv to do simple image analysis
# Let's check if cv2 is installed, if not we will use PIL.
try:
    import cv2
    print("opencv installed")
except ImportError:
    print("opencv not installed")
