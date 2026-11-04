import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  Req,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { Request } from 'express';

@Controller()
export class PaymentController {
  constructor(@Inject(PaymentService) private readonly paymentService: PaymentService) {}

  @Post('payments/initiate')
  async initiate(
    @Body('provider') provider: string,
    @Body('amount') amount: number,
    @Body('currency') currency = 'RWF',
    @Body('transaction_id') transactionId?: string,
  ) {
    return this.paymentService.initiatePayment(provider, amount, currency, transactionId);
  }

  @Post('webhooks/momo-callback')
  async callback(
    @Headers('x-jako-signature') signature: string,
    @Body() payload: any,
    @Req() request: Request,
  ) {
    if (!signature) throw new BadRequestException('missing signature header');
    const rawBody = (request as any).rawBody || JSON.stringify(payload);
    return this.paymentService.processProviderCallback(signature, payload, rawBody);
  }

  @Get('payments/:transactionId')
  async getOne(@Param('transactionId') transactionId: string) {
    return this.paymentService.getPayment(transactionId);
  }

  @Get('payments')
  async list() {
    return this.paymentService.listPayments();
  }
}
