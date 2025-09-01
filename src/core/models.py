from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional


@dataclass
class Expense:
    """
    Represents a single expense record in the application.
    This class serves as a data contract between the application layers.
    """

    amount: Decimal
    description: str
    method: str
    tag: str
    category: str
    installments: Optional[int] = None
    id: Optional[int] = field(init=False, default=None)
    expense_ts: Optional[datetime] = field(init=False, default=None)
