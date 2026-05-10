import tensorflow as tf
import os

# Use relative path
current_dir = os.path.dirname(os.path.abspath(__file__))
# Navigate up to the root (app/brain/ID/scratch -> app/brain/ID -> app/brain -> app -> root)
# Actually, easier to just use the project root if we know where it is, 
# but let's just use the relative path to the models folder from the root.
project_root = os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".."))
model_path = os.path.join(project_root, "app", "models", "check-xray-model.h5")
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
