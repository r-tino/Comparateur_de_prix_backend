import { Module } from '@nestjs/common';
import { ProduitService } from './produit.service';
import { ProduitController } from './produit.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [AuthModule], // Ajoutez AuthModule ici
  controllers: [ProduitController],
  providers: [ProduitService, PrismaService, JwtAuthGuard],
})
export class ProduitModule {}
