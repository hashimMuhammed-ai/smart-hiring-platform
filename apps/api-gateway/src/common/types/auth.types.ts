/** Represents the authenticated user object attached to the request by JwtStrategy. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
}
