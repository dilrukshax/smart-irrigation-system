# Shared Libraries

This directory contains shared code and schemas used across all microservices.

## Structure

```
shared/
├── schemas/        # API schemas (OpenAPI, JSON Schema)
├── events/         # Event definitions for message queues
└── utils/          # Common utilities
```

## Usage

These shared libraries can be:
1. Copied directly into services (simple approach)
2. Published as packages (pip/npm) for better versioning
3. Used as Git submodules
