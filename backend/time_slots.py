"""Shared 1-hour delivery time-slot definitions, per meal type.

Kept in its own module (no other imports) so subscriptions.py, orders.py and
delivery.py can all depend on it without circular imports.
"""

from __future__ import annotations

from typing import Dict, List

MEAL_TIME_SLOTS: Dict[str, List[str]] = {
    "breakfast": ["7:00 – 8:00 AM", "8:00 – 9:00 AM"],
    "lunch": ["12:00 – 1:00 PM", "1:00 – 2:00 PM"],
    "dinner": ["7:00 – 8:00 PM", "8:00 – 9:00 PM"],
}
