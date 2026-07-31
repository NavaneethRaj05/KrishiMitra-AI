export default function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.stack || message);
  }

  res.status(status).json({
    success: false,
    error:   message,
  });
}
