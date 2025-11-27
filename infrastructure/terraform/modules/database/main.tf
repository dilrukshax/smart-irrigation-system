# Database Module - Cosmos DB and PostgreSQL

variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "project_name" { type = string }
variable "environment" { type = string }
variable "tags" { type = map(string) }

# Azure Cosmos DB for MongoDB API (Auth Service)
resource "azurerm_cosmosdb_account" "mongodb" {
  name                = "cosmos-${var.project_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "MongoDB"
  
  capabilities {
    name = "EnableMongo"
  }
  
  consistency_policy {
    consistency_level = "Session"
  }
  
  geo_location {
    location          = var.location
    failover_priority = 0
  }
  
  tags = var.tags
}

# PostgreSQL Flexible Server (Optimization Service)
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                   = "psql-${var.project_name}-${var.environment}"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "16"
  administrator_login    = "psqladmin"
  administrator_password = random_password.postgres.result
  storage_mb             = 32768
  sku_name               = var.environment == "prod" ? "GP_Standard_D2s_v3" : "B_Standard_B1ms"
  
  tags = var.tags
}

resource "random_password" "postgres" {
  length  = 16
  special = true
}

output "mongodb_connection_string" {
  value     = azurerm_cosmosdb_account.mongodb.connection_strings[0]
  sensitive = true
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.postgres.fqdn
}
