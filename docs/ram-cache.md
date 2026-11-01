# RAM cache

The process-local public-data cache is enabled by default.

Set the environment variable before starting the server:

```text
RAM_CACHE_ENABLED=true
```

Accepted disabled values are `false`, `0`, `off`, and `no` (case-insensitive).
When disabled:

- read paths query MongoDB directly;
- server startup skips cache warm-up;
- CMS write paths skip RAM snapshot refreshes;
- metric writes continue to update MongoDB normally.

The flag is read at runtime, but production deployments should set it before
starting or restarting the Node.js process.
