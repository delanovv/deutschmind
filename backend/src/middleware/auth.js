import jwt from "jsonwebtoken";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("JWT_SECRET должен содержать минимум 32 символа");
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
    issuer: "deutschmind",
  });
}

export function requireAuth(req, res, next) {
  const raw = req.headers.authorization;
  if (!raw) {
    return res.status(401).json({ error: "Нужна авторизация" });
  }
  const [scheme, token] = raw.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Нужна авторизация" });
  }
  try {
    const payload = jwt.verify(token, jwtSecret(), { issuer: "deutschmind" });
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "Сессия недействительна или истекла" });
  }
}
