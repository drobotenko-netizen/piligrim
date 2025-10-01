import jwt from 'jsonwebtoken'

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'dev-secret-change'

export function signAccessToken(payload: any, expiresIn: string = '12h') {
  return jwt.sign(payload, AUTH_JWT_SECRET, { algorithm: 'HS256', expiresIn })
}

export function verifyAccessToken(token: string): any {
  return jwt.verify(token, AUTH_JWT_SECRET, { algorithms: ['HS256'] })
}


