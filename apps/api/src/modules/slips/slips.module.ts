import { Module } from '@nestjs/common';
import { SlipStorageService } from './slip-storage.service';
import { SlipVerifierService } from './slip-verifier.service';

@Module({
  providers: [SlipVerifierService, SlipStorageService],
  exports: [SlipVerifierService, SlipStorageService],
})
export class SlipsModule {}
