#!/bin/bash
# Start the legacy room client
cd "$(dirname "$0")"
python client.py "$@"
