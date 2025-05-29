#!/bin/bash
# Deactivation script for Aida development environment

if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "ℹ️  No virtual environment is currently active"
    return 0 2>/dev/null || exit 0
fi

echo "👋 Deactivating Aida development environment"
deactivate
