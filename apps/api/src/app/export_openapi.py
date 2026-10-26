"""Print the OpenAPI spec, for generating the TypeScript client: python -m app.export_openapi"""

import json
import os

# The spec doesn't depend on secrets, but settings validation does.
os.environ.setdefault("JWT_SECRET", "x" * 32)

from app.main import create_app  # noqa: E402

if __name__ == "__main__":
    print(json.dumps(create_app().openapi(), indent=2, sort_keys=True))
