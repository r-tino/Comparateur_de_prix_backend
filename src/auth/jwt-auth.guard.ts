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
      (routePath === '/offres' && method === 'GET') ||
      (routePath === '/offres/:id' && method === 'GET')
    ) {
      return true;
    }
    
    if (!authHeader) {
      throw new UnauthorizedException("Token d'authentification manquant.");
    }

    const token = authHeader.split(' ')[1]; // Assurer que le token est après 'Bearer'
    
    try {
      const decoded = this.jwtService.verify(token);
      request.user = decoded; // Ajouter les informations de l'utilisateur à la requête
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token invalide ou expiré.');
    }
  }
}
