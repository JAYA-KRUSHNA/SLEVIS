"""Test YOLO detection on ALL classes to see what it can detect."""
from ultralytics import YOLO
from PIL import Image, ImageDraw
import numpy as np

# Load model
print("Loading YOLOv8s...")
model = YOLO('yolov8s.pt')
print(f"✅ Model: {model.model_name}")
print(f"\nAll COCO classes this model can detect:")
for k, v in model.names.items():
    print(f"  [{k}] {v}")

# Create a synthetic test image with shapes that look like vehicles
# This tests the model is working — real detection needs real images
print("\n\n" + "="*60)
print("The model CAN detect motorcycles (class 3).")
print("If your uploaded image has bikes but they're not detected,")
print("possible reasons:")
print("  1. Very small bikes in the image (far away)")
print("  2. Occluded/overlapping bikes")  
print("  3. Unusual angles")
print("  4. Low image resolution")
print("")
print("SOLUTION: Lower confidence threshold to catch more detections")
print("="*60)

# Test with conf=0.05 (very aggressive)
img = Image.new('RGB', (640, 480), (100, 100, 100))
results_05 = model(img, conf=0.05, verbose=False)
results_15 = model(img, conf=0.15, verbose=False)
results_25 = model(img, conf=0.25, verbose=False)
print(f"\nBlank image detections:")
print(f"  conf=0.05: {len(results_05[0].boxes)} detections")
print(f"  conf=0.15: {len(results_15[0].boxes)} detections")
print(f"  conf=0.25: {len(results_25[0].boxes)} detections")
