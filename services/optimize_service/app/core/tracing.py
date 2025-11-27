"""
Distributed Tracing with OpenTelemetry

This module provides distributed tracing capabilities using OpenTelemetry.
It enables end-to-end tracing across all services in the smart irrigation system.

Features:
- Automatic trace propagation
- Span creation for requests and database calls
- Integration with Jaeger for trace visualization
- Configurable sampling rates
"""

import logging
from typing import Optional
from functools import wraps

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.trace import Status, StatusCode
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class TracingConfig:
    """Configuration for distributed tracing."""
    
    def __init__(
        self,
        service_name: str,
        otlp_endpoint: Optional[str] = None,
        enable_console_export: bool = False,
        sample_rate: float = 1.0,
    ):
        """
        Initialize tracing configuration.
        
        Args:
            service_name: Name of this service (appears in traces)
            otlp_endpoint: OTLP collector endpoint (e.g., http://jaeger:4317)
            enable_console_export: Whether to also export to console
            sample_rate: Fraction of requests to trace (0.0 to 1.0)
        """
        self.service_name = service_name
        self.otlp_endpoint = otlp_endpoint
        self.enable_console_export = enable_console_export
        self.sample_rate = sample_rate


def setup_tracing(config: TracingConfig) -> None:
    """
    Set up OpenTelemetry tracing for the application.
    
    This should be called once at application startup.
    
    Args:
        config: Tracing configuration
    """
    # Create resource with service info
    resource = Resource.create({
        SERVICE_NAME: config.service_name,
        "service.version": "1.0.0",
        "deployment.environment": get_settings().app_env,
    })
    
    # Create tracer provider
    provider = TracerProvider(resource=resource)
    
    # Add OTLP exporter if endpoint is configured
    if config.otlp_endpoint:
        otlp_exporter = OTLPSpanExporter(
            endpoint=config.otlp_endpoint,
            insecure=True,  # Use secure=False for local development
        )
        provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        logger.info(f"OTLP exporter configured for: {config.otlp_endpoint}")
    
    # Add console exporter for debugging
    if config.enable_console_export:
        console_exporter = ConsoleSpanExporter()
        provider.add_span_processor(BatchSpanProcessor(console_exporter))
        logger.info("Console trace exporter enabled")
    
    # Set the global tracer provider
    trace.set_tracer_provider(provider)
    
    logger.info(f"Tracing initialized for service: {config.service_name}")


def instrument_fastapi(app) -> None:
    """
    Instrument a FastAPI application for automatic tracing.
    
    This adds automatic span creation for all HTTP requests.
    
    Args:
        app: FastAPI application instance
    """
    FastAPIInstrumentor.instrument_app(app)
    logger.info("FastAPI instrumented for tracing")


def instrument_sqlalchemy(engine) -> None:
    """
    Instrument SQLAlchemy for automatic database query tracing.
    
    Args:
        engine: SQLAlchemy engine instance
    """
    SQLAlchemyInstrumentor().instrument(engine=engine)
    logger.info("SQLAlchemy instrumented for tracing")


def instrument_httpx() -> None:
    """
    Instrument HTTPX client for automatic outbound request tracing.
    """
    HTTPXClientInstrumentor().instrument()
    logger.info("HTTPX client instrumented for tracing")


# Global tracer instance
_tracer: Optional[trace.Tracer] = None


def get_tracer() -> trace.Tracer:
    """
    Get the global tracer instance.
    
    Returns:
        OpenTelemetry tracer for creating spans
    """
    global _tracer
    if _tracer is None:
        _tracer = trace.get_tracer(__name__)
    return _tracer


def traced(span_name: Optional[str] = None, attributes: Optional[dict] = None):
    """
    Decorator to create a span for a function.
    
    Args:
        span_name: Custom name for the span (defaults to function name)
        attributes: Additional attributes to add to the span
    
    Usage:
        @traced("my-operation")
        def my_function():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            tracer = get_tracer()
            name = span_name or func.__name__
            with tracer.start_as_current_span(name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)
                try:
                    result = await func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            tracer = get_tracer()
            name = span_name or func.__name__
            with tracer.start_as_current_span(name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)
                try:
                    result = func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


class SpanContext:
    """
    Context manager for creating traced spans with automatic error handling.
    
    Usage:
        with SpanContext("my-operation", {"key": "value"}) as span:
            span.set_attribute("result", "success")
            # do work
    """
    
    def __init__(self, name: str, attributes: Optional[dict] = None):
        self.name = name
        self.attributes = attributes or {}
        self.tracer = get_tracer()
        self.span = None
    
    def __enter__(self):
        self.span = self.tracer.start_span(self.name)
        for key, value in self.attributes.items():
            self.span.set_attribute(key, value)
        return self.span
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            self.span.record_exception(exc_val)
        else:
            self.span.set_status(Status(StatusCode.OK))
        self.span.end()
        return False


def extract_trace_context(headers: dict) -> dict:
    """
    Extract trace context from incoming request headers.
    
    This enables trace propagation between services.
    
    Args:
        headers: Dictionary of HTTP headers
    
    Returns:
        Trace context dictionary
    """
    propagator = TraceContextTextMapPropagator()
    return propagator.extract(carrier=headers)


def inject_trace_context(headers: dict) -> dict:
    """
    Inject trace context into outgoing request headers.
    
    This enables trace propagation to downstream services.
    
    Args:
        headers: Dictionary of HTTP headers to inject into
    
    Returns:
        Headers with trace context added
    """
    propagator = TraceContextTextMapPropagator()
    propagator.inject(carrier=headers)
    return headers


def add_span_attributes(attributes: dict) -> None:
    """
    Add attributes to the current span.
    
    Args:
        attributes: Key-value pairs to add
    """
    span = trace.get_current_span()
    for key, value in attributes.items():
        span.set_attribute(key, value)


def record_exception(exception: Exception) -> None:
    """
    Record an exception in the current span.
    
    Args:
        exception: The exception to record
    """
    span = trace.get_current_span()
    span.record_exception(exception)
    span.set_status(Status(StatusCode.ERROR, str(exception)))
