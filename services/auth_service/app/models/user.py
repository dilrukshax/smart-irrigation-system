"""
SQLAlchemy ORM model for the users table (PostgreSQL).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.roles import normalize_roles
from app.db.postgres import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    national_id: Mapped[str | None] = mapped_column(
        String(32), unique=True, nullable=True, index=True
    )
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    roles: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=lambda: ["farmer"]
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self) -> dict:
        """Return a safe dict representation (no password)."""
        return {
            "id": str(self.id),
            "username": self.username,
            "full_name": self.full_name,
            "national_id": self.national_id,
            "phone_number": self.phone_number,
            "email": self.email,
            "roles": normalize_roles(self.roles),
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
