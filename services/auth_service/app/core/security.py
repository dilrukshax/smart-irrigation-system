"""
Security utilities for password hashing and JWT token management.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.core.config import settings


# Password hashing context: prefer bcrypt_sha256 (handles long passwords)
# Keep plain bcrypt as a fallback to verify existing hashes.
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    
    Args:
        password: Plain text password to hash.
        
    Returns:
        Hashed password string.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.
    
    Args:
        plain_password: Plain text password to verify.
        hashed_password: Hashed password to compare against.
        
    Returns:
        True if password matches, False otherwise.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError as exc:
        # Workaround for bcrypt's 72-byte limit when a plain bcrypt hash is stored.
        # If the password is too long, attempt a safe truncation check and log a warning.
        msg = str(exc)
        logging.warning("Password verification raised ValueError: %s", msg)

        if "longer than 72 bytes" in msg or "cannot be longer than 72 bytes" in msg:
            try:
                truncated = plain_password[:72]
                if pwd_context.verify(truncated, hashed_password):
                    logging.warning(
                        "Password matched after truncation to 72 bytes — consider rehashing user with bcrypt_sha256."
                    )
                    return True
            except Exception:
                logging.exception("Fallback truncation verification failed.")

        return False


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing token payload data.
        expires_delta: Optional custom expiration time.
        
    Returns:
        Encoded JWT token string.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Dictionary containing token payload data.
        expires_delta: Optional custom expiration time.
        
    Returns:
        Encoded JWT refresh token string.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string to decode.
        
    Returns:
        Decoded token payload as dictionary.
        
    Raises:
        HTTPException: If token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate an access token.
    
    Args:
        token: JWT access token string to decode.
        
    Returns:
        Decoded token payload as dictionary.
        
    Raises:
        HTTPException: If token is invalid, expired, or not an access token.
    """
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a refresh token.
    
    Args:
        token: JWT refresh token string to decode.
        
    Returns:
        Decoded token payload as dictionary.
        
    Raises:
        HTTPException: If token is invalid, expired, or not a refresh token.
    """
    payload = decode_token(token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Refresh token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload
