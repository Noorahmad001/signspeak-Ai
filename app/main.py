from flask import Flask
from app.routes.views import views_bp
from app.routes.predict import predict_bp
from app.ai.inference import load_model


def create_app():
    app = Flask(__name__)

    app.register_blueprint(views_bp)
    app.register_blueprint(predict_bp)

    load_model()

    return app