# SLEVIS Deep Learning Backend

Python-based deep learning backend for violation prediction using TensorFlow/Keras neural networks.

## Setup

```bash
cd ml_backend
pip install -r requirements.txt
python train_model.py  # Train the model (optional - pre-trained included)
python server.py       # Start the API server
```

## API Endpoints

- `POST /predict` - Predict violations
- `POST /classify` - Classify complaints (NLP)
- `GET /health` - Health check

## Model Architecture

- Neural Network with 3 hidden layers (128, 64, 32 neurons)
- ReLU activation, Dropout for regularization
- Softmax output for multi-class prediction
