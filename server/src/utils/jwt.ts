import jwt, { SignOptions } from 'jsonwebtoken'

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-secret'

export function signJwt(payload: object, secret: string, opts: SignOptions = {}): string {
  return jwt.sign(payload, secret as unknown as jwt.Secret, opts)
}

export function signAccessToken(payload: object, expiresIn: number | undefined = undefined): string {
  const opts: SignOptions = { algorithm: 'HS256' }
  if (expiresIn !== undefined) opts.expiresIn = expiresIn
  return signJwt(payload, AUTH_JWT_SECRET, opts)
}

export function verifyAccessToken(token: string): any {
  return jwt.verify(token, AUTH_JWT_SECRET, { algorithms: ['HS256'] })
}

