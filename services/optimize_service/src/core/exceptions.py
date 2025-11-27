"""
Custom Exceptions and Exception Handlers

This module defines custom exception classes for the ACA-O service
and registers FastAPI exception handlers to convert them into
structured JSON responses.

Exception Hierarchy:
    DomainError (base)
    ├── NotFoundError (404)
    ├── ValidationError (400)
    └── OptimizationError (500)
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# =============================================================================
# Custom Exception Classes
# =============================================================================

class DomainError(Exception):
    """
    Base exception for all domain/business logic errors.
    
    All custom exceptions should inherit from this class.
    This allows catching all domain errors with a single except clause.
    
    Attributes:
        message: Human-readable error description
        details: Optional additional context about the error
    """
    
    def __init__(self, message: str, details: Any = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class NotFoundError(DomainError):
    """
    Raised when a requested resource is not found.
    
    Maps to HTTP 404 status code.
    
    Examples:
        - Field not found by ID
        - Crop variety not in database
        - Historical data not available
    """
    pass


class ValidationError(DomainError):
    """
    Raised when input validation fails at the domain level.
    
    Maps to HTTP 400 status code.
    
    Note: This is different from Pydantic's ValidationError.
    Use this for business rule validation, not schema validation.
    
    Examples:
        - Season format invalid
        - Water quota exceeds maximum allowed
        - Invalid crop combination requested
    """
    pass


class OptimizationError(DomainError):
    """
    Raised when the optimization algorithm fails or produces invalid results.
    
    Maps to HTTP 500 status code.
    
    Examples:
        - No feasible solution found
        - Optimization timeout
        - Constraint conflict detected
    """
    pass


class ExternalServiceError(DomainError):
    """
    Raised when an external service call fails.
    
    Maps to HTTP 502 (Bad Gateway) status code.
    
    Examples:
        - Forecasting service unavailable
        - IoT data service timeout
        - Price API returned error
    """
    pass


# =============================================================================
# Exception Handlers
# =============================================================================

def create_error_response(
    status_code: int,
    error_type: str,
    message: str,
    details: Any = None,
) -> JSONResponse:
    """
    Create a standardized JSON error response.
    
    Args:
        status_code: HTTP status code
        error_type: Error classification (e.g., "NotFoundError")
        message: Human-readable error message
        details: Optional additional context
    
    Returns:
        JSONResponse with structured error body
    """
    content = {
        "error": {
            "type": error_type,
            "message": message,
        }
    }
    
    if details is not None:
        content["error"]["details"] = details
    
    return JSONResponse(status_code=status_code, content=content)


async def not_found_error_handler(
    request: Request,
    exc: NotFoundError,
) -> JSONResponse:
    """Handle NotFoundError exceptions."""
    logger.warning(f"NotFoundError: {exc.message} - Path: {request.url.path}")
    return create_error_response(
        status_code=404,
        error_type="NotFoundError",
        message=exc.message,
        details=exc.details,
    )


async def validation_error_handler(
    request: Request,
    exc: ValidationError,
) -> JSONResponse:
    """Handle ValidationError exceptions."""
    logger.warning(f"ValidationError: {exc.message} - Path: {request.url.path}")
    return create_error_response(
        status_code=400,
        error_type="ValidationError",
        message=exc.message,
        details=exc.details,
    )


async def optimization_error_handler(
    request: Request,
    exc: OptimizationError,
) -> JSONResponse:
    """Handle OptimizationError exceptions."""
    logger.error(f"OptimizationError: {exc.message} - Path: {request.url.path}")
    return create_error_response(
        status_code=500,
        error_type="OptimizationError",
        message=exc.message,
        details=exc.details,
    )


async def external_service_error_handler(
    request: Request,
    exc: ExternalServiceError,
) -> JSONResponse:
    """Handle ExternalServiceError exceptions."""
    logger.error(f"ExternalServiceError: {exc.message} - Path: {request.url.path}")
    return create_error_response(
        status_code=502,
        error_type="ExternalServiceError",
        message=exc.message,
        details=exc.details,
    )


async def domain_error_handler(
    request: Request,
    exc: DomainError,
) -> JSONResponse:
    """Catch-all handler for any DomainError not handled specifically."""
    logger.error(f"DomainError: {exc.message} - Path: {request.url.path}")
    return create_error_response(
        status_code=500,
        error_type="DomainError",
        message=exc.message,
        details=exc.details,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Register all custom exception handlers with the FastAPI app.
    
    Call this function during app startup to ensure all domain
    exceptions are properly converted to JSON responses.
    
    Args:
        app: The FastAPI application instance
    """
    app.add_exception_handler(NotFoundError, not_found_error_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(OptimizationError, optimization_error_handler)
    app.add_exception_handler(ExternalServiceError, external_service_error_handler)
    app.add_exception_handler(DomainError, domain_error_handler)
    
    logger.debug("Custom exception handlers registered")
