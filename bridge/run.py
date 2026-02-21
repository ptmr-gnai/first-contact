#!/usr/bin/env python3
"""
Entry point for the sensor bridge server.

Usage:
    python run.py
    python run.py --host 0.0.0.0 --port 8000
"""

import argparse
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="Sensor Bridge Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    args = parser.parse_args()

    uvicorn.run(
        "bridge.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
        # Single worker to avoid BLE conflicts
        workers=1,
    )


if __name__ == "__main__":
    main()
