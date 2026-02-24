from flask import request, jsonify, Flask
from flask_cors import CORS
from main import SessionManager


app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
session_manager = SessionManager()


@app.route("/start", methods=["POST"])
def start_session():
    try:
        data = request.get_json()
        config_name = data.get("config_name") if data else None
        if not config_name:
            return jsonify({"error": "Missing 'config_name' in request body."}), 400
        result = session_manager.start_session(config_name)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/stop", methods=["POST"])
def stop_session():
    try:
        result = session_manager.stop_session()
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/status", methods=["GET"])
def get_status():
    try:
        result = session_manager.status()
        if "error" in result:
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=12040, debug= False)