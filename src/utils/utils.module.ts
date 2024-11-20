// src/utils/utils.module.ts
import { Module } from '@nestjs/common';
import { ImageGeneratorService } from './image-generator.service';

@Module({
  providers: [ImageGeneratorService],
  exports: [ImageGeneratorService], // Expose le service
})
export class UtilsModule {}
