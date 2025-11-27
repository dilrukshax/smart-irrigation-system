# Key Vault Module Outputs

output "key_vault_id" {
  description = "Key Vault resource ID"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "tenant_id" {
  description = "Azure AD tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}

output "secret_ids" {
  description = "Map of secret names to their IDs"
  value = {
    postgres_password = azurerm_key_vault_secret.postgres_password.id
    jwt_secret_key    = azurerm_key_vault_secret.jwt_secret.id
    redis_password    = azurerm_key_vault_secret.redis_password.id
    influxdb_token    = azurerm_key_vault_secret.influxdb_token.id
    grafana_password  = azurerm_key_vault_secret.grafana_password.id
  }
}

output "private_endpoint_ip" {
  description = "Private endpoint IP address"
  value       = var.enable_private_endpoint ? azurerm_private_endpoint.keyvault[0].private_service_connection[0].private_ip_address : null
}
