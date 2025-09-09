import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
    );

    const consoleFormat = format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message, context, ...metadata }) => {
        let msg = `${timestamp} [${level}]`;
        if (context) {
          msg += ` [${context}]`;
        }
        msg += ` ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      }),
    );

    // テスト環境ではファイルローテートを無効化して安定化
    const isTestEnv = process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';

    const transports: winston.transport[] | any[] = [
      new winston.transports.Console({ format: consoleFormat }),
    ];

    if (!isTestEnv) {
      // ログファイルの設定（本番/開発のみ）
      const fileRotateTransport = new (DailyRotateFile as any)({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
      });

      const errorFileRotateTransport = new (DailyRotateFile as any)({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormat,
      });

      transports.push(fileRotateTransport, errorFileRotateTransport);
    }

    // Winstonロガーの作成
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: {
        service: 'process-todo-api',
        environment: process.env.NODE_ENV || 'development',
      },
      transports,
    });

    // 本番環境では外部ログサービスに送信（例：CloudWatch, Datadog等）
    if (process.env.NODE_ENV === 'production') {
      this.addProductionTransports();
    }
  }

  private addProductionTransports() {
    // 本番環境用の追加トランスポート
    // 例: CloudWatch, Datadog, Elasticsearch等
    // this.logger.add(new CloudWatchTransport({ ... }));
  }

  // NestJS LoggerService インターフェースの実装
  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }

  // カスタムメソッド
  logHttpRequest(method: string, url: string, statusCode: number, duration: number, metadata?: any) {
    this.logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      ...metadata,
    });
  }

  logError(error: Error, context?: string, metadata?: any) {
    this.logger.error({
      message: error.message,
      stack: error.stack,
      context,
      ...metadata,
    });
  }

  logBusinessEvent(event: string, userId?: number, metadata?: any) {
    this.logger.info('Business Event', {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logPerformance(operation: string, duration: number, metadata?: any) {
    const level = duration > 1000 ? 'warn' : 'info';
    this.logger.log(level, 'Performance Metric', {
      operation,
      duration,
      ...metadata,
    });
  }

  logAudit(action: string, userId: number, resource: string, metadata?: any) {
    this.logger.info('Audit Log', {
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  // 統計情報の記録
  logMetrics(metrics: Record<string, any>) {
    this.logger.info('Application Metrics', metrics);
  }

  // セキュリティイベントの記録
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: any) {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger.log(level, 'Security Event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}