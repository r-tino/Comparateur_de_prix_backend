import { Controller, Post, Get, Param, Body, Patch, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { UtilisateurService } from './utilisateur.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Utilisateur } from '@prisma/client';

@Controller('utilisateurs')
export class UtilisateurController {
  constructor(private readonly utilisateurService: UtilisateurService) {}

  // Route pour créer un utilisateur (inscription) avec téléchargement de photo optionnel
  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  async createUser(
    @Body() data: CreateUtilisateurDto & { confirmPassword: string },
    @UploadedFile() photo?: Express.Multer.File,
  ): Promise<{ message: string }> {
    return await this.utilisateurService.createUser(data, photo);
  }

  // Route pour récupérer tous les utilisateurs (accessible uniquement aux administrateurs)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get()
  async getAllUsers(): Promise<{ users: Utilisateur[], message: string }> {
    return await this.utilisateurService.getAllUsers();
  }

  // Route pour récupérer un utilisateur par ID (accessible uniquement aux administrateurs)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<{ user: Utilisateur | null, message: string }> {
    return await this.utilisateurService.getUserById(id);
  }

  // Route pour mettre à jour un utilisateur avec téléchargement de photo optionnel (accessible uniquement à l'utilisateur connecté ou à un administrateur)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur', 'Visiteur')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photo'))
  async updateUser(
    @Param('id') id: string,
    @Body() data: UpdateUtilisateurDto,
    @UploadedFile() photo?: Express.Multer.File,
  ): Promise<{ message: string }> {
    return await this.utilisateurService.updateUser(id, data, photo);
  }

  // Route pour mettre à jour la photo de profil (accessible uniquement à l'utilisateur connecté)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('Admin', 'Vendeur', 'Visiteur')
  // @Patch(':id/photo')
  // async updateProfilePhoto(@Param('id') id: string, @Body('photoUrl') photoUrl: string): Promise<Utilisateur> {
  //   return await this.utilisateurService.updateProfilePhoto(id, photoUrl);
  // }

  // Route pour supprimer un utilisateur (accessible uniquement aux administrateurs)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return await this.utilisateurService.deleteUser(id);
  }
}


