export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const isValidPhone = (phone: string): boolean =>
  /^\+?[\d\s\-()]{8,}$/.test(phone)

export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
