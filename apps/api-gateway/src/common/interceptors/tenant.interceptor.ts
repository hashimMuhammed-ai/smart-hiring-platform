import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../types/auth.types.js';

interface RequestWithTenant {
  user?: AuthenticatedUser;
  tenantId?: string;
}

/**
 * Reads tenantId from the JWT payload (set by JwtStrategy) and attaches it
 * directly to the request object so downstream controllers can use it without
 * extracting it from the user object each time.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    if (request.user?.tenantId) {
      request.tenantId = request.user.tenantId;
    }

    return next.handle();
  }
}
