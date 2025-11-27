# Runbook: Service Recovery

## Overview

This runbook covers common recovery procedures for the Smart Irrigation System services.

---

## Service Not Responding

### Symptoms
- Health checks failing
- 502/503 errors from gateway
- Increased latency

### Diagnosis

```bash
# Check pod status
kubectl get pods -n smart-irrigation-prod -l app=<service-name>

# Check pod logs
kubectl logs -n smart-irrigation-prod -l app=<service-name> --tail=100

# Check events
kubectl get events -n smart-irrigation-prod --sort-by='.lastTimestamp'
```

### Recovery Steps

1. **Restart pods** (if stuck):
   ```bash
   kubectl rollout restart deployment/<service-name> -n smart-irrigation-prod
   ```

2. **Scale up** (if under load):
   ```bash
   kubectl scale deployment/<service-name> --replicas=5 -n smart-irrigation-prod
   ```

3. **Check resource limits** (if OOMKilled):
   ```bash
   kubectl describe pod <pod-name> -n smart-irrigation-prod
   ```

---

## Database Connection Issues

### Symptoms
- "Connection refused" errors
- Timeouts on database queries
- Connection pool exhausted alerts

### Diagnosis

```bash
# Check database connectivity from pod
kubectl exec -it <pod-name> -n smart-irrigation-prod -- \
  python -c "from src.infrastructure.database import test_connection; test_connection()"

# Check connection pool metrics
curl http://<service>:8000/metrics | grep database_connection
```

### Recovery Steps

1. **Verify database is running**:
   ```bash
   # For PostgreSQL
   az postgres flexible-server show --name <server-name> --resource-group <rg>
   
   # For MongoDB (Cosmos)
   az cosmosdb show --name <account-name> --resource-group <rg>
   ```

2. **Restart service to reset connections**:
   ```bash
   kubectl rollout restart deployment/<service-name> -n smart-irrigation-prod
   ```

3. **Check firewall rules** if using Azure managed databases

---

## High Memory Usage

### Symptoms
- OOMKilled pods
- Slow response times
- Memory alerts in Grafana

### Diagnosis

```bash
# Check current memory usage
kubectl top pods -n smart-irrigation-prod

# Get detailed resource info
kubectl describe pod <pod-name> -n smart-irrigation-prod | grep -A5 "Limits:"
```

### Recovery Steps

1. **Immediate relief** - increase replicas to distribute load:
   ```bash
   kubectl scale deployment/<service-name> --replicas=5 -n smart-irrigation-prod
   ```

2. **Update resource limits** (requires deployment):
   - Edit `infrastructure/kubernetes/overlays/production/kustomization.yaml`
   - Increase memory limits
   - Apply changes

3. **Investigate memory leaks**:
   - Enable memory profiling
   - Review recent code changes

---

## Certificate Expiration

### Symptoms
- TLS handshake failures
- Browser security warnings
- HTTPS connection refused

### Prevention

- Set up cert-manager for automatic renewal
- Configure alerts 30 days before expiration

### Recovery Steps

1. **Check certificate status**:
   ```bash
   kubectl get certificate -n smart-irrigation-prod
   ```

2. **Force renewal** (if using cert-manager):
   ```bash
   kubectl delete certificate <cert-name> -n smart-irrigation-prod
   # cert-manager will recreate it
   ```

3. **Manual renewal** (if needed):
   - Generate new certificate
   - Update Kubernetes secret
   - Restart ingress controller

---

## Deployment Rollback

### When to Rollback
- New version causing errors
- Performance degradation after deployment
- Feature not working as expected

### Steps

```bash
# Check deployment history
kubectl rollout history deployment/<service-name> -n smart-irrigation-prod

# Rollback to previous version
kubectl rollout undo deployment/<service-name> -n smart-irrigation-prod

# Rollback to specific revision
kubectl rollout undo deployment/<service-name> --to-revision=<number> -n smart-irrigation-prod

# Monitor rollback
kubectl rollout status deployment/<service-name> -n smart-irrigation-prod
```

---

## Escalation

If issues persist after following this runbook:

1. **Check Grafana dashboards** for system-wide issues
2. **Review recent changes** in git history
3. **Escalate to on-call engineer** if production impact

### Contact

- On-call rotation: PagerDuty
- Slack channel: #smart-irrigation-ops
- Emergency: See internal wiki
