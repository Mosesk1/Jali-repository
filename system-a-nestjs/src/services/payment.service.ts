import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

@Injectable()
export class PaymentService {
  private readonly SHARED_SECRET = process.env.SHARED_SECRET || 'jali_secret_123';
  private readonly LARAVEL_URL =
    process.env.LARAVEL_URL || 'http://127.0.0.1:8000/api/v1/momo/initialize';

  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    @Inject(HttpService) private readonly httpService: HttpService,
  ) {}

  async initiatePayment(provider: string, amount: number, currency = 'RWF', transactionId?: string) {
    if (!provider) throw new BadRequestException('provider is required');
    if (!amount || amount <= 0) throw new BadRequestException('amount must be > 0');

    const txId = transactionId || `${provider.toUpperCase()}${Date.now()}`;
    const now = new Date();

    const existing = await this.entityManager.findOne(PaymentTransaction, {
      where: { transaction_id: txId },
    });
    if (existing) {
      throw new BadRequestException('transaction_id already exists');
    }

    const tx = this.entityManager.create(PaymentTransaction, {
      provider: provider.toUpperCase(),
      transaction_id: txId,
      amount: Number(amount),
      currency: (currency || 'RWF').toUpperCase(),
      status: 'PENDING',
      provider_timestamp: now,
      created_at: now,
      updated_at: now,
    });
    await this.entityManager.save(tx);

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.LARAVEL_URL, {
          provider: provider.toUpperCase(),
          transaction_id: txId,
          amount: Number(amount),
          currency: (currency || 'RWF').toUpperCase(),
        }),
      );

      const updated = await this.entityManager.findOne(PaymentTransaction, {
        where: { transaction_id: txId },
      });

      return {
        message: 'ok',
        transaction_id: txId,
        status: updated?.status || 'PENDING',
        provider_response: response.data,
      };
    } catch (error) {
      console.error('provider error', error instanceof Error ? error.message : error);

      const updated = await this.entityManager.findOne(PaymentTransaction, {
        where: { transaction_id: txId },
      });
      if (updated && updated.status !== 'PENDING') {
        return {
          message: 'provider failed but callback already updated payment',
          transaction_id: txId,
          status: updated.status,
        };
      }

      throw new InternalServerErrorException('provider timeout, payment still PENDING');
    }
  }

  async processProviderCallback(signature: string, payload: any, rawBody: string) {
    const expected = crypto
      .createHmac('sha256', this.SHARED_SECRET)
      .update(rawBody)
      .digest('hex');

    if (!signature || signature.toLowerCase() !== expected.toLowerCase()) {
      throw new UnauthorizedException('bad signature');
    }

    const provider = String(payload.provider || '').toUpperCase();
    const transactionId = String(payload.transaction_id || '');
    const amount = Number(payload.amount);
    const currency = String(payload.currency || 'RWF').toUpperCase();
    const status = String(payload.status || '').toUpperCase();
    const timestamp = payload.timestamp;

    if (!provider || !transactionId || !amount || !timestamp) {
      throw new BadRequestException('missing fields');
    }
    if (!['SUCCESS', 'FAILED', 'PENDING'].includes(status)) {
      throw new BadRequestException('invalid status');
    }

    return await this.entityManager.transaction(async (manager) => {
      let tx = await manager
        .createQueryBuilder(PaymentTransaction, 'tx')
        .setLock('pessimistic_write')
        .where('tx.transaction_id = :transactionId', { transactionId })
        .getOne();

      if (!tx) {
        const now = new Date();
        tx = manager.create(PaymentTransaction, {
          provider,
          transaction_id: transactionId,
          amount,
          currency,
          status: 'PENDING',
          provider_timestamp: new Date(timestamp),
          created_at: now,
          updated_at: now,
        });
        await manager.save(tx);
      }

      if (tx.status !== 'PENDING') {
        return {
          message: 'already processed',
          transaction_id: tx.transaction_id,
          status: tx.status,
        };
      }

      if (Number(tx.amount) !== amount || tx.currency !== currency) {
        tx.status = 'FAILED';
        tx.updated_at = new Date();
        await manager.save(tx);
        throw new BadRequestException('amount/currency mismatch');
      }

      tx.status = status as 'PENDING' | 'SUCCESS' | 'FAILED';
      tx.provider_timestamp = new Date(timestamp);
      tx.updated_at = new Date();
      await manager.save(tx);

      return {
        message: 'updated',
        transaction_id: tx.transaction_id,
        status: tx.status,
      };
    });
  }

  async getPayment(transactionId: string) {
    const tx = await this.entityManager.findOne(PaymentTransaction, {
      where: { transaction_id: transactionId },
    });
    if (!tx) throw new NotFoundException('not found');
    return tx;
  }

  async listPayments() {
    return this.entityManager.find(PaymentTransaction, {
      order: { created_at: 'DESC' },
      take: 50,
    });
  }
}
