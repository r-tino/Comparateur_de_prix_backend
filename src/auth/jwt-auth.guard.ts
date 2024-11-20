// src/auth/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const routePath = request.route.path;
    const method = request.method;

    // Permettre l'accès sans token pour les endpoints spécifiques
    if (
      (routePath === '/auth/login') ||
      (routePath === '/utilisateurs' && method === 'POST') ||
      (routePath === '/utilisateurs/:id' && method === 'GET') ||
      (routePath === '/api/offres' && method === 'GET') ||
      (routePath === '/api/offres/:id' && method === 'GET')
    ) {
      return true;
    }
    
    if (!authHeader) {
      throw new UnauthorizedException("Token d'authentification manquant.");
    }

    const token = authHeader.split(' ')[1]; // Assurer que le token est après 'Bearer'
    
    try {
      const decoded = this.jwtService.verify(token);
      // Mappez correctement l'ID utilisateur dans `req.user` en utilisant `userId`
      request.user = {
        ...decoded,
        id_User: decoded.id_User || decoded.userId, // Ajoutez `id_User` en utilisant `userId` si `id_User` est absent
      };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token invalide ou expiré.');
    }
  }
}
