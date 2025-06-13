"""
Core functionality for Chatterbox TTS API
"""

from .memory import get_memory_info, cleanup_memory, safe_delete_tensors
from .text_processing import split_text_into_chunks, concatenate_audio_chunks
from .tts_model import initialize_model, get_model
from .aliases import (
    alias_route, 
    add_route_aliases, 
    get_all_aliases, 
    add_custom_alias,
    add_multiple_aliases,
    remove_alias,
    get_endpoint_info,
    ENDPOINT_ALIASES
)

__all__ = [
    "get_memory_info",
    "cleanup_memory", 
    "safe_delete_tensors",
    "split_text_into_chunks",
    "concatenate_audio_chunks",
    "initialize_model",
    "get_model",
    "alias_route",
    "add_route_aliases",
    "get_all_aliases",
    "add_custom_alias",
    "add_multiple_aliases",
    "remove_alias",
    "get_endpoint_info",
    "ENDPOINT_ALIASES"
] 