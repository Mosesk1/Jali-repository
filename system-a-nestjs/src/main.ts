import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  }));

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log('listening on', port);
}
bootstrap();
