import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionController } from './promotion.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [AuthModule], // Ajoutez AuthModule ici
  controllers: [PromotionController],
  providers: [PromotionService, PrismaService, JwtAuthGuard],
})
export class PromotionModule {}