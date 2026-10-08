import { Module } from '@nestjs/common';

import { DatabaseReadService } from './database-read.service.js';

import { DatabaseService } from './database.service.js';

@Module({
  providers: [DatabaseService, DatabaseReadService],
  exports: [DatabaseService, DatabaseReadService],
})
export class DatabaseModule {}
