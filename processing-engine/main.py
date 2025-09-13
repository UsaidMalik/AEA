from engines.facial_engine import FacialEngine
from configs.study_config import action_config

def main():
    engine = FacialEngine(action_config=action_config)
    engine.start_detection()
    engine.stop_detection()

if __name__ == "__main__":
    main()