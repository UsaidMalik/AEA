import pytest
from collections import deque
from .buffer_parser import parse_buffer  # adjust if your file is named differently

def test_parse_buffer_dominant_emotion():
    buffer = deque(['happy'] * 7 + ['sad'] * 3)
    assert parse_buffer(buffer, percentage=0.6, buffer_size=10) == 'happy'

def test_parse_buffer_no_dominant_emotion():
    buffer = deque(['happy'] * 5 + ['sad'] * 5)
    assert parse_buffer(buffer, percentage=0.6, buffer_size=10) is None

def test_parse_buffer_incomplete():
    buffer = deque(['happy'] * 5)
    assert parse_buffer(buffer, percentage=0.6, buffer_size=10) is None
