#!/bin/bash
# Start the modular room client
cd "$(dirname "$0")/.."
python main.py "$@"
