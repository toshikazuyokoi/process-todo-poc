import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';

/**
 * AI Exception Filter
 * AI関連のエラーハンドリング用フィルター
 * GlobalExceptionFilterを継承し、AI関連のエラーログを識別可能にする
 */
@Catch()
export class AIExceptionFilter extends GlobalExceptionFilter {
  constructor() {
    super();
    // loggerプロパティを上書き
    (this as any).logger = new Logger('AIExceptionFilter');
  }
}