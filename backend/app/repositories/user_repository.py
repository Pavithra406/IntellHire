from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password
from typing import Optional


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def create(self, email: str, full_name: str, password: str, role: str = "candidate") -> User:
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            role=role
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_password(self, user_id: int, new_password: str) -> User:
        user = self.get_by_id(user_id)
        user.hashed_password = hash_password(new_password)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_all_hr(self):
        return self.db.query(User).filter(User.role == "hr").all()
