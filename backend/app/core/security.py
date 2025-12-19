"""
安全工具模块：密码加密、JWT token 生成和验证
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings


def _truncate_password(password: str) -> bytes:
    """截断密码到72字节（bcrypt限制）"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        # 移除可能的不完整UTF-8字符的尾部字节
        while len(password_bytes) > 0:
            last_byte = password_bytes[-1]
            if (last_byte & 0xC0) == 0x80:
                password_bytes = password_bytes[:-1]
            else:
                break
    return password_bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    password_bytes = _truncate_password(plain_password)
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """获取密码哈希值
    
    bcrypt 限制密码最大长度为 72 字节，需要截断
    """
    password_bytes = _truncate_password(password)
    # 使用 bcrypt 生成哈希，rounds=12
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=12))
    return hashed.decode('utf-8')


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """创建刷新令牌"""
    to_encode = data.copy()
    # 刷新令牌有效期更长，默认7天
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """解码令牌"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token(token: str) -> bool:
    """验证令牌是否有效"""
    payload = decode_token(token)
    if payload is None:
        return False
    # 检查是否过期
    exp = payload.get("exp")
    if exp is None:
        return False
    if datetime.utcnow().timestamp() > exp:
        return False
    return True

