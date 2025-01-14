// src/categorie/categorie.controller.ts

import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { CategorieService } from './categorie.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Controller('categorie')
export class CategorieController {
  constructor(private readonly categorieService: CategorieService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async createCategorie(@Body() createCategorieDto: CreateCategorieDto) {
    return this.categorieService.createCategorie(createCategorieDto);
  }

  @Get()
  async getCategories(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('nomCategorie') nomCategorie?: string,
  ) {
    const isAdmin = req.user?.role === 'Admin';
    return this.categorieService.getCategories(Number(page), Number(limit), nomCategorie, isAdmin || false);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async updateCategorie(
    @Param('id') id: string,
    @Body() updateCategorieDto: UpdateCategorieDto,
  ) {
    return this.categorieService.updateCategorie(id, updateCategorieDto);
  }

  @Delete(':id')
  async deleteCategorie(@Param('id') id: string) {
    return this.categorieService.deleteCategorie(id);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async getCategorieStatistics() {
    return this.categorieService.getCategorieStatistics();
  }
}