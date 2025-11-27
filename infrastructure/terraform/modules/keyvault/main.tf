# Azure Key Vault Module for Smart Irrigation System
# 
# This module creates an Azure Key Vault with:
# - RBAC authorization
# - Private endpoint support
# - Soft delete and purge protection
# - Network ACLs

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Data source for current Azure client
data "azurerm_client_config" "current" {}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

# Azure Key Vault
resource "azurerm_key_vault" "main" {
  name                          = "${var.name_prefix}-kv-${random_string.suffix.result}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = var.sku_name
  
  # Enable RBAC authorization (recommended over access policies)
  enable_rbac_authorization     = true
  
  # Security settings
  enabled_for_deployment          = var.enabled_for_deployment
  enabled_for_disk_encryption     = var.enabled_for_disk_encryption
  enabled_for_template_deployment = var.enabled_for_template_deployment
  soft_delete_retention_days      = var.soft_delete_retention_days
  purge_protection_enabled        = var.purge_protection_enabled

  # Network ACLs
  network_acls {
    bypass                     = "AzureServices"
    default_action             = var.network_default_action
    ip_rules                   = var.allowed_ip_ranges
    virtual_network_subnet_ids = var.allowed_subnet_ids
  }

  tags = var.tags
}

# Role assignment for current user (Key Vault Administrator)
resource "azurerm_role_assignment" "admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Role assignment for AKS managed identity (Key Vault Secrets User)
resource "azurerm_role_assignment" "aks_secrets" {
  count                = var.aks_principal_id != "" ? 1 : 0
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.aks_principal_id
}

# Initial secrets
resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "database-postgres-password"
  value        = var.postgres_password != "" ? var.postgres_password : random_password.postgres.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_role_assignment.admin]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret-key"
  value        = var.jwt_secret_key != "" ? var.jwt_secret_key : random_password.jwt.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_role_assignment.admin]
}

resource "azurerm_key_vault_secret" "redis_password" {
  name         = "redis-password"
  value        = var.redis_password != "" ? var.redis_password : random_password.redis.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_role_assignment.admin]
}

resource "azurerm_key_vault_secret" "influxdb_token" {
  name         = "influxdb-token"
  value        = var.influxdb_token != "" ? var.influxdb_token : random_password.influxdb.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_role_assignment.admin]
}

resource "azurerm_key_vault_secret" "grafana_password" {
  name         = "grafana-admin-password"
  value        = var.grafana_password != "" ? var.grafana_password : random_password.grafana.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [azurerm_role_assignment.admin]
}

# Random passwords for secrets
resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "redis" {
  length           = 32
  special          = true
  override_special = "!@#$%^&*"
}

resource "random_password" "influxdb" {
  length  = 64
  special = false
}

resource "random_password" "grafana" {
  length           = 24
  special          = true
  override_special = "!@#$%^&*"
}

# Private endpoint (optional)
resource "azurerm_private_endpoint" "keyvault" {
  count               = var.enable_private_endpoint ? 1 : 0
  name                = "${var.name_prefix}-kv-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name_prefix}-kv-psc"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  tags = var.tags
}
