export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'change_this_secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
