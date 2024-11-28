import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoriquePrixService } from '../historique-prix/historique-prix.service'; // Import du service HistoriquePrix


@Module({
  imports: [AuthModule], // Ajoutez AuthModule ici
  controllers: [PromotionController],
  providers: [PromotionService, PrismaService, JwtAuthGuard, HistoriquePrixService],
})
export class PromotionModule {}