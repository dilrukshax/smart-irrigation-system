"""
Resilience Patterns Module

This module implements resilience patterns for production-grade microservices:
- Circuit Breaker: Prevents cascade failures by failing fast
- Retry with Exponential Backoff: Handles transient failures
- Timeout: Prevents indefinite waiting
- Bulkhead: Isolates failures

Usage:
    from app.core.resilience import circuit_breaker, retry_with_backoff
    
    @circuit_breaker(failure_threshold=5, recovery_timeout=30)
    @retry_with_backoff(max_retries=3)
    async def call_external_service():
        ...
"""

import asyncio
import functools
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional, TypeVar, Dict
from collections import defaultdict

import httpx

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing fast, not allowing requests
    HALF_OPEN = "half_open"  # Testing if service has recovered


@dataclass
class CircuitBreakerState:
    """Maintains state for a circuit breaker instance."""
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float = 0
    last_success_time: float = 0


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open."""
    pass


class CircuitBreaker:
    """
    Circuit Breaker implementation.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Circuit is open, requests fail immediately
    - HALF_OPEN: Testing if service recovered, limited requests allowed
    
    Example:
        breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)
        
        @breaker
        async def call_service():
            ...
    """
    
    # Class-level storage for circuit states (per service/endpoint)
    _circuits: Dict[str, CircuitBreakerState] = defaultdict(CircuitBreakerState)
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
        name: Optional[str] = None,
    ):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery
            half_open_max_calls: Max calls allowed in half-open state
            name: Unique name for this circuit (defaults to function name)
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.name = name
    
    def __call__(self, func: Callable[..., T]) -> Callable[..., T]:
        """Decorator to wrap function with circuit breaker."""
        circuit_name = self.name or func.__name__
        
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            state = self._circuits[circuit_name]
            
            # Check if circuit should transition from OPEN to HALF_OPEN
            if state.state == CircuitState.OPEN:
                if time.time() - state.last_failure_time >= self.recovery_timeout:
                    logger.info(f"Circuit '{circuit_name}' transitioning to HALF_OPEN")
                    state.state = CircuitState.HALF_OPEN
                    state.success_count = 0
                else:
                    logger.warning(f"Circuit '{circuit_name}' is OPEN, failing fast")
                    raise CircuitBreakerError(
                        f"Circuit breaker '{circuit_name}' is open. "
                        f"Service unavailable, please retry later."
                    )
            
            try:
                result = await func(*args, **kwargs)
                self._on_success(circuit_name)
                return result
            except Exception as e:
                self._on_failure(circuit_name, e)
                raise
        
        return wrapper
    
    def _on_success(self, circuit_name: str) -> None:
        """Handle successful call."""
        state = self._circuits[circuit_name]
        state.last_success_time = time.time()
        
        if state.state == CircuitState.HALF_OPEN:
            state.success_count += 1
            if state.success_count >= self.half_open_max_calls:
                logger.info(f"Circuit '{circuit_name}' recovered, transitioning to CLOSED")
                state.state = CircuitState.CLOSED
                state.failure_count = 0
        else:
            state.failure_count = 0
    
    def _on_failure(self, circuit_name: str, error: Exception) -> None:
        """Handle failed call."""
        state = self._circuits[circuit_name]
        state.failure_count += 1
        state.last_failure_time = time.time()
        
        logger.warning(
            f"Circuit '{circuit_name}' failure #{state.failure_count}: {error}"
        )
        
        if state.state == CircuitState.HALF_OPEN:
            logger.warning(f"Circuit '{circuit_name}' failed in HALF_OPEN, reopening")
            state.state = CircuitState.OPEN
        elif state.failure_count >= self.failure_threshold:
            logger.error(f"Circuit '{circuit_name}' threshold reached, opening circuit")
            state.state = CircuitState.OPEN
    
    @classmethod
    def get_state(cls, circuit_name: str) -> CircuitBreakerState:
        """Get the current state of a circuit."""
        return cls._circuits[circuit_name]
    
    @classmethod
    def reset(cls, circuit_name: str) -> None:
        """Reset a circuit to closed state."""
        cls._circuits[circuit_name] = CircuitBreakerState()
        logger.info(f"Circuit '{circuit_name}' has been reset")


def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0,
    half_open_max_calls: int = 3,
    name: Optional[str] = None,
) -> Callable:
    """
    Decorator factory for circuit breaker.
    
    Args:
        failure_threshold: Number of failures before opening circuit
        recovery_timeout: Seconds to wait before attempting recovery
        half_open_max_calls: Max calls allowed in half-open state
        name: Unique name for this circuit
    
    Example:
        @circuit_breaker(failure_threshold=5, recovery_timeout=30)
        async def call_external_api():
            ...
    """
    return CircuitBreaker(
        failure_threshold=failure_threshold,
        recovery_timeout=recovery_timeout,
        half_open_max_calls=half_open_max_calls,
        name=name,
    )


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    retryable_exceptions: tuple = (httpx.RequestError, ConnectionError, TimeoutError),
) -> Callable:
    """
    Decorator for retry with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay between retries (seconds)
        exponential_base: Base for exponential backoff calculation
        retryable_exceptions: Tuple of exception types that trigger retry
    
    Example:
        @retry_with_backoff(max_retries=3, base_delay=1.0)
        async def fetch_data():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt < max_retries:
                        delay = min(
                            base_delay * (exponential_base ** attempt),
                            max_delay
                        )
                        logger.warning(
                            f"Retry {attempt + 1}/{max_retries} for {func.__name__} "
                            f"after {delay:.2f}s due to: {e}"
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(
                            f"All {max_retries} retries exhausted for {func.__name__}"
                        )
            
            raise last_exception
        
        return wrapper
    return decorator


def timeout(seconds: float) -> Callable:
    """
    Decorator to add timeout to async functions.
    
    Args:
        seconds: Maximum time to wait for function completion
    
    Example:
        @timeout(30.0)
        async def slow_operation():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=seconds
                )
            except asyncio.TimeoutError:
                logger.error(f"Timeout ({seconds}s) exceeded for {func.__name__}")
                raise TimeoutError(
                    f"Operation {func.__name__} timed out after {seconds} seconds"
                )
        return wrapper
    return decorator


class ResilientHttpClient:
    """
    HTTP client with built-in resilience patterns.
    
    Features:
    - Automatic retries with exponential backoff
    - Circuit breaker per host
    - Configurable timeouts
    - Request/response logging
    
    Example:
        client = ResilientHttpClient()
        response = await client.get("http://service/api/data")
    """
    
    def __init__(
        self,
        timeout: float = 30.0,
        max_retries: int = 3,
        circuit_failure_threshold: int = 5,
        circuit_recovery_timeout: float = 30.0,
    ):
        self.timeout = timeout
        self.max_retries = max_retries
        self.circuit_failure_threshold = circuit_failure_threshold
        self.circuit_recovery_timeout = circuit_recovery_timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._circuits: Dict[str, CircuitBreaker] = {}
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    def _get_circuit(self, host: str) -> CircuitBreaker:
        """Get or create circuit breaker for host."""
        if host not in self._circuits:
            self._circuits[host] = CircuitBreaker(
                failure_threshold=self.circuit_failure_threshold,
                recovery_timeout=self.circuit_recovery_timeout,
                name=f"http_{host}",
            )
        return self._circuits[host]
    
    async def request(
        self,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """
        Make HTTP request with resilience patterns.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            **kwargs: Additional arguments for httpx
        
        Returns:
            httpx.Response: Response object
        
        Raises:
            CircuitBreakerError: If circuit is open
            httpx.RequestError: If all retries fail
        """
        from urllib.parse import urlparse
        host = urlparse(url).netloc
        circuit = self._get_circuit(host)
        
        @circuit
        @retry_with_backoff(max_retries=self.max_retries)
        async def _request() -> httpx.Response:
            client = await self._get_client()
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        
        return await _request()
    
    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        """Make GET request."""
        return await self.request("GET", url, **kwargs)
    
    async def post(self, url: str, **kwargs: Any) -> httpx.Response:
        """Make POST request."""
        return await self.request("POST", url, **kwargs)
    
    async def put(self, url: str, **kwargs: Any) -> httpx.Response:
        """Make PUT request."""
        return await self.request("PUT", url, **kwargs)
    
    async def delete(self, url: str, **kwargs: Any) -> httpx.Response:
        """Make DELETE request."""
        return await self.request("DELETE", url, **kwargs)
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Global resilient client instance
_resilient_client: Optional[ResilientHttpClient] = None


def get_resilient_client() -> ResilientHttpClient:
    """Get global resilient HTTP client instance."""
    global _resilient_client
    if _resilient_client is None:
        _resilient_client = ResilientHttpClient()
    return _resilient_client
