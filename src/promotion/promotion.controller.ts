// src/promotion/promotion.controller.ts

import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Req, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @Roles('Admin', 'Vendeur')
  async create(@Body() createPromotionDto: CreatePromotionDto, @Req() req) {
    console.log("User data in request:", req.user); // Ajouter ce log pour déboguer
    const { user } = req;
    if (!user || !user.id_User) {
      throw new ForbiddenException("Utilisateur non autorisé ou ID manquant");
    }
    const promotion = await this.promotionService.create(createPromotionDto, user.id_User);
    return promotion;
  }
  

  @Get()
  async findAll() {
    return await this.promotionService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const promotion = await this.promotionService.findOne(id);
    if (!promotion) {
      throw new NotFoundException('Promotion non trouvée');
    }
    return promotion;
  }

  @Patch(':id')
  @Roles('Admin', 'Vendeur') // Utilisation directe des rôles
  async update(@Param('id') id: string, @Body() updatePromotionDto: UpdatePromotionDto, @Req() req) {
    const { user } = req;
    const updatedPromotion = await this.promotionService.update(id, updatePromotionDto, user.id_User);
    return updatedPromotion;
  }

  @Delete(':id')
  @Roles('Admin', 'Vendeur') // Utilisation directe des rôles
  async remove(@Param('id') id: string, @Req() req) {
    const { user } = req;
    return await this.promotionService.remove(id, user.id_User);
  }
}

