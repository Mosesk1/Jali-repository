import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentController } from './controllers/payment.controller';
import { HealthController } from './controllers/health.controller';
import { PaymentService } from './services/payment.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'jali_payment_gateway',
      entities: [PaymentTransaction],
      synchronize: false,
      extra: {
        insecureAuth: true,
      },
    }),
    TypeOrmModule.forFeature([PaymentTransaction]),
  ],
  controllers: [PaymentController, HealthController],
  providers: [PaymentService],
})
export class AppModule {}
