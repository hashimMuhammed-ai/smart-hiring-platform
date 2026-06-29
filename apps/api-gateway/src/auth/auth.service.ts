import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Tenant, User } from '@app/shared/database';
import { JwtPayload } from '@app/shared/types';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

export interface RegisterResult {
  tenantId: string;
  userId: string;
  accessToken: string;
}

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const tenant = this.tenantRepo.create({ name: dto.tenantName, plan: 'free' });
    const savedTenant = await this.tenantRepo.save(tenant);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      tenantId: savedTenant.id,
      email: dto.email,
      passwordHash,
      role: 'admin',
    });
    const savedUser = await this.userRepo.save(user);

    const payload: JwtPayload = {
      sub: savedUser.id,
      tenantId: savedTenant.id,
      role: savedUser.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return { tenantId: savedTenant.id, userId: savedUser.id, accessToken };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
