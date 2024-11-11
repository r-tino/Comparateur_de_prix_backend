import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UtilisateurService } from '../utilisateur/utilisateur.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateurService: UtilisateurService,
    private readonly jwtService: JwtService,  // Ajout du service JWT
  ) {}

  // Validation de l'utilisateur et génération du token JWT
  async login(email: string, motDePasse: string) {
    try {
      console.log('Recherche de l\'utilisateur...'); // Ajout du log

      const user = await this.utilisateurService.getUserByEmail(email);

      console.log('Utilisateur trouvé:', user); // Affiche l'utilisateur trouvé
      if (!user) {
        throw new NotFoundException("Cet email n'est pas enregistré.");
      }

      const isPasswordValid = await bcrypt.compare(motDePasse, user.motDePasse);
      console.log('Mot de passe valide:', isPasswordValid); // Affiche true ou false
      if (!isPasswordValid) {
        throw new UnauthorizedException('Mot de passe incorrect');
      }

      // Génération du token JWT
      const payload = { userId: user.id_User, role: user.role };
      const token = this.jwtService.sign(payload);

      return {
        user,
        token,  // Inclusion du token dans la réponse
      };
    } catch (error) {
      throw error;
    }
  }
}
