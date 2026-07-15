"""
Announcement model for notice board and broadcasting
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, Enum as SAEnum, ForeignKey, func
from sqlalchemy import Uuid as SAUuid
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(SAUuid(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(
        SAEnum('low', 'normal', 'high', 'urgent', name='announcement_priority_enum'),
        nullable=False, server_default='normal'
    )
    is_published = Column(Boolean, nullable=False, server_default='false', index=True)
    
    author_id = Column(SAUuid(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationship
    author = relationship("User", foreign_keys=[author_id])

    def __repr__(self):
        return f"<Announcement(id={self.id}, title={self.title}, priority={self.priority}, is_published={self.is_published})>"
