import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'payment_transactions' })
export class PaymentTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  transaction_id: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'RWF' })
  currency: string;

  @Column({ type: 'enum', enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING' })
  status: 'PENDING' | 'SUCCESS' | 'FAILED';

  @Column({ type: 'datetime' })
  provider_timestamp: Date;

  @Column({ type: 'datetime' })
  created_at: Date;

  @Column({ type: 'datetime' })
  updated_at: Date;
}
