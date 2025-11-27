# API Gateway Dockerfile

FROM nginx:1.25-alpine

LABEL org.opencontainers.image.title="API Gateway"
LABEL org.opencontainers.image.description="NGINX-based API Gateway for Smart Irrigation"

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config
COPY nginx.conf /etc/nginx/conf.d/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
