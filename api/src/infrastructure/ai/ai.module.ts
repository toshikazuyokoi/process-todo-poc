import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { OpenAIService } from './openai.service';
import { WebSearchService } from './web-search.service';
import { HttpClientService } from '../external/http-client.service';
import { RateLimiterService } from '../external/rate-limiter.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [
    OpenAIService,
    WebSearchService,
    HttpClientService,
    RateLimiterService,
  ],
  exports: [
    OpenAIService,
    WebSearchService,
    HttpClientService,
    RateLimiterService,
  ],
})
export class AIModule {}