import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export function verifyPassword(password: string): boolean {
  return password === process.env.AUTH_PASSWORD
}

export function createToken(): string {
  return jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}
