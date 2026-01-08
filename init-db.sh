#!/bin/bash
set -e

# Create additional databases
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE metabase;
    GRANT ALL PRIVILEGES ON DATABASE metabase TO postgres;
EOSQL
