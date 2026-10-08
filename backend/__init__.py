"""Backend package marker.

Exists so ``backend/tests`` has the unique dotted name ``backend.tests``. Without
it, both ``backend/tests`` and ``ml/tests`` are packages named ``tests`` and
pytest cannot collect them in a single invocation.

This does not affect the app: uvicorn runs with ``--app-dir backend``, so
``app`` is imported as a top-level package and this file is never loaded.
"""
