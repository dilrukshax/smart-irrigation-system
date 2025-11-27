"""
Logging Configuration

This module sets up logging for the ACA-O service.
Configures console output with timestamps, log levels, and module names.

Usage:
    from app.core.logging_config import setup_logging
    
    setup_logging()  # Call once at application startup
"""

import logging
import sys
from typing import Optional

from app.core.config import get_settings


def setup_logging(level: Optional[str] = None) -> None:
    """
    Configure application-wide logging.
    
    Sets up a console handler with a consistent format across all modules.
    Should be called once during application startup.
    
    Args:
        level: Override log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
               If not provided, uses LOG_LEVEL from settings
    
    Log format:
        2025-01-15 10:30:45 | INFO | src.main | Application started
        ^timestamp          ^level ^module    ^message
    """
    # Get settings for default log level
    settings = get_settings()
    log_level_str = level or settings.log_level
    
    # Convert string to logging level constant
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)
    
    # Define log format
    # Format: timestamp | level | module | message
    log_format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Create formatter
    formatter = logging.Formatter(fmt=log_format, datefmt=date_format)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Add our handler
    root_logger.addHandler(console_handler)
    
    # Set level for third-party loggers to reduce noise
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    # Log that logging has been configured
    logger = logging.getLogger(__name__)
    logger.debug(f"Logging configured with level: {log_level_str}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.
    
    Convenience function to get a properly named logger.
    
    Args:
        name: Logger name (typically __name__ of the calling module)
    
    Returns:
        logging.Logger: Configured logger instance
    
    Usage:
        from app.core.logging_config import get_logger
        
        logger = get_logger(__name__)
        logger.info("Something happened")
    """
    return logging.getLogger(name)
