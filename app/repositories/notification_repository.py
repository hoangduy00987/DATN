from sqlalchemy.orm import Session
from app.db.models import Notification
from uuid import UUID

class NotificationRepository:
    @staticmethod
    def create(db: Session, user_id: UUID, title: str, message: str, link: str = None):
        new_notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            is_read=False
        )
        db.add(new_notif)
        db.commit()
        db.refresh(new_notif)
        return new_notif

    @staticmethod
    def get_by_user(db: Session, user_id: UUID, limit: int = 10):
        return db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()

    @staticmethod
    def mark_as_read(db: Session, notification_id: UUID, user_id: UUID):
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notif:
            notif.is_read = True
            db.commit()
            db.refresh(notif)
        return notif

    @staticmethod
    def count_unread(db: Session, user_id: UUID):
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()
