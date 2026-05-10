import tensorflow as tf
import os

model_path = r"d:\Code\DATN\fastapi-rag-chatbot\app\models\check-xray-model.h5"
if os.path.exists(model_path):
    try:
        model = tf.keras.models.load_model(model_path, compile=False)
        print(f"Model: {model_path}")
        print(f"Input shape: {model.input_shape}")
        print(f"Output shape: {model.output_shape}")
        # Print the last layer to see activation
        print(f"Last layer: {model.layers[-1].name}")
        if hasattr(model.layers[-1], 'activation'):
            print(f"Activation: {model.layers[-1].activation.__name__}")
    except Exception as e:
        print(f"Error: {e}")
else:
    print(f"File not found: {model_path}")
