import { Module } from '@nestjs/common';
import { OffreService } from './offre.service';
import { OffreController } from './offre.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoriquePrixService } from 'src/historique-prix/historique-prix.service';

@Module({
  imports: [AuthModule], // Ajoutez AuthModule ici
  controllers: [OffreController],
  providers: [OffreService, PrismaService, HistoriquePrixService, JwtAuthGuard],
})
export class OffreModule {}
