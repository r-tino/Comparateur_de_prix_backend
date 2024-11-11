import { Controller, Post, Body, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

    // Route de connexion par email et mot de passe
  @Post('login')
  async login(@Body('email') email: string, @Body('motDePasse') motDePasse: string) {
    try {
      const user = await this.authService.login(email, motDePasse);
      return { message: 'Connexion réussie', ...user };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Une erreur est survenue lors de la connexion.');
    }
  }
}
