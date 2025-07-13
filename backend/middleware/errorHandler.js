// Centralized Express error handler middleware
export function errorHandler(err, req, res, next) {
  // Log the error with context
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    params: req.params,
    body: req.body,
  });

  // Customize error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}
