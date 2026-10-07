import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { PublicExceptionFilter } from './public-exception.filter.js';

@Module({
  providers: [{ provide: APP_FILTER, useClass: PublicExceptionFilter }],
})
export class TransportModule {}
