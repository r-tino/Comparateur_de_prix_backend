// src/utilisateur/utilisateur.controller.ts
import { Controller, Post, Get, Param, Body, Patch, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { UtilisateurService } from './utilisateur.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Utilisateur } from '@prisma/client';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('utilisateurs')
export class UtilisateurController {
  constructor(
    private readonly utilisateurService: UtilisateurService,
    private readonly CloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photoFile'))
  async createUser(
    @Body() data: CreateUtilisateurDto & { confirmPassword: string },
    @UploadedFile() photoFile?: Express.Multer.File,
  ): Promise<{ message: string }> {
    let photoUrl = null;
    if (photoFile) {
      const uploadResult = await this.CloudinaryService.uploadLocalImage(photoFile.path, 'users/profiles');
      photoUrl = uploadResult.url;
    }
    await this.utilisateurService.createUser(data, photoUrl);
    return { message: 'Utilisateur créé avec succès' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Get()
  async getAllUsers(): Promise<{ users: Utilisateur[]; message: string }> {
    return await this.utilisateurService.getAllUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<{ user: Utilisateur | null; message: string }> {
    return await this.utilisateurService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Vendeur', 'Visiteur')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('photoProfile')) // Le champ dans la requête est maintenant "photoProfile"
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: UpdateUtilisateurDto,
    @UploadedFile() photo?: Express.Multer.File
  ): Promise<{ message: string }> {
    console.log(`Début de la mise à jour pour l'utilisateur ID: ${id}`);
    console.log('Fichier photo reçu:', photo);

    return await this.utilisateurService.updateUser(id, updateData, photo);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return await this.utilisateurService.deleteUser(id);
  }
}