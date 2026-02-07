# Execution Scripts

Deterministic Python scripts that do the actual work.

## Principles

- **Deterministic**: Same input = same output
- **Well-commented**: Explain what and why
- **Error handling**: Fail gracefully with clear messages
- **Testable**: Can be run independently
- **Fast**: Optimized for performance

## Script Template

```python
#!/usr/bin/env python3
"""
Script description: What this script does

Usage:
    python script_name.py --arg1 value1 --arg2 value2
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main(arg1, arg2):
    """
    Main function description

    Args:
        arg1: description
        arg2: description

    Returns:
        description of return value
    """
    try:
        # Your code here
        pass
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Script description")
    parser.add_argument("--arg1", required=True, help="Description")
    parser.add_argument("--arg2", required=True, help="Description")

    args = parser.parse_args()
    main(args.arg1, args.arg2)
```

## Common Patterns

### Loading environment variables
```python
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("API_KEY")
```

### Reading/writing JSON
```python
import json

# Read
with open(".tmp/data.json", "r") as f:
    data = json.load(f)

# Write
with open(".tmp/data.json", "w") as f:
    json.dump(data, f, indent=2)
```

### API requests with retry
```python
import requests
from time import sleep

def api_call_with_retry(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            sleep(2 ** attempt)  # Exponential backoff
```
