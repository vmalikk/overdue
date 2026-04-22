import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  // Reuse the existing key or define a new one. 
  // For simplicity and existing setup, we reuse the key if a specific Moodle one isn't defined
  const key = process.env.MOODLE_ENCRYPTION_KEY || process.env.GRADESCOPE_ENCRYPTION_KEY
  if (!key) {
    throw new Error('Encryption key environment variable is not set')
  }
  // Key should be base64 encoded 32-byte key
  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be a 32-byte key encoded in base64')
  }
  return keyBuffer
}

export function encryptData(data: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(data, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

export function decryptData(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivStr, authTagStr, encryptedStr] = encryptedData.split(':')

  if (!ivStr || !authTagStr || !encryptedStr) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Buffer.from(ivStr, 'base64')
  const authTag = Buffer.from(authTagStr, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedStr, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
