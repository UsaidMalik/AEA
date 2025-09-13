"""
This file is used to parse the buffer and check if the emotion has been present the whole time 
that the time the buffer is full
"""

from collections import deque
from collections import Counter

def parse_buffer(buffer: deque, percentage, max_size):
    # if the most prevelant emotion in the buffer is greater
    # than the percentage then return that emotion as the 
    # current buffer emotion
    if len(buffer) != max_size:
        return None

    emotion_counts = Counter(buffer)
    
    # Find the most prevalent emotion
    most_prevalent_emotion = emotion_counts.most_common(1)[0][0]
    emotion_count = emotion_counts[most_prevalent_emotion]
    
    # Check if it meets the percentage threshold
    emotion_percentage = emotion_count / max_size
    
    if emotion_percentage >= percentage:
        return most_prevalent_emotion
    else:
        return None