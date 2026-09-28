function logger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const user = req.user ? req.user.email : "guest";

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${user} - ${duration}ms`
    );
  });

  next();
}

module.exports = { logger };