import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, retry, timeout } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface HttpClientOptions extends AxiosRequestConfig {
  retryAttempts?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly defaultTimeout: number;
  private readonly defaultRetryAttempts: number;
  private readonly defaultRetryDelay: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.defaultTimeout = this.configService.get<number>('HTTP_CLIENT_TIMEOUT', 30000);
    this.defaultRetryAttempts = this.configService.get<number>('HTTP_CLIENT_RETRY_ATTEMPTS', 3);
    this.defaultRetryDelay = this.configService.get<number>('HTTP_CLIENT_RETRY_DELAY', 1000);
  }

  async get<T = any>(url: string, options: HttpClientOptions = {}): Promise<T> {
    return this.request<T>('GET', url, null, options);
  }

  async post<T = any>(
    url: string,
    data?: any,
    options: HttpClientOptions = {},
  ): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T = any>(
    url: string,
    data?: any,
    options: HttpClientOptions = {},
  ): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  async delete<T = any>(url: string, options: HttpClientOptions = {}): Promise<T> {
    return this.request<T>('DELETE', url, null, options);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    options: HttpClientOptions = {},
  ): Promise<T> {
    const {
      retryAttempts = this.defaultRetryAttempts,
      retryDelay = this.defaultRetryDelay,
      timeoutMs = this.defaultTimeout,
      ...axiosConfig
    } = options;

    const config: AxiosRequestConfig = {
      ...axiosConfig,
      method,
      url,
      data,
    };

    try {
      const startTime = Date.now();
      
      const response$ = this.httpService.request<T>(config).pipe(
        timeout(timeoutMs),
        retry({
          count: retryAttempts,
          delay: retryDelay,
          resetOnSuccess: true,
        }),
      );

      const response = await firstValueFrom(response$);
      
      const duration = Date.now() - startTime;
      this.logger.debug(`${method} ${url} completed in ${duration}ms`);
      
      return response.data;
    } catch (error: any) {
      this.logger.error(`${method} ${url} failed`, {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      // Enhanced error handling
      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const message = error.response.data?.message || error.message;
        
        if (status === 429) {
          throw new Error(`Rate limit exceeded: ${message}`);
        } else if (status >= 500) {
          throw new Error(`Server error: ${message}`);
        } else if (status >= 400) {
          throw new Error(`Client error: ${message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      } else if (error.code === 'ENOTFOUND') {
        throw new Error(`DNS lookup failed for ${url}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused to ${url}`);
      }

      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  /**
   * Perform multiple requests in parallel with concurrency control
   */
  async batchRequest<T>(
    requests: Array<{
      method: string;
      url: string;
      data?: any;
      options?: HttpClientOptions;
    }>,
    concurrency: number = 5,
  ): Promise<T[]> {
    const results: T[] = [];
    const queue = [...requests];
    const inProgress: Promise<void>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      while (inProgress.length < concurrency && queue.length > 0) {
        const request = queue.shift()!;
        
        const promise = this.request<T>(
          request.method,
          request.url,
          request.data,
          request.options,
        ).then((result) => {
          results.push(result);
        }).catch((error) => {
          this.logger.error(`Batch request failed for ${request.url}`, error);
          results.push(null as any);
        });

        inProgress.push(promise);
      }

      if (inProgress.length > 0) {
        await Promise.race(inProgress);
        
        // Remove completed promises
        for (let i = inProgress.length - 1; i >= 0; i--) {
          if (await this.isPromiseSettled(inProgress[i])) {
            inProgress.splice(i, 1);
          }
        }
      }
    }

    return results;
  }

  private async isPromiseSettled(promise: Promise<any>): Promise<boolean> {
    return Promise.race([
      promise.then(() => true).catch(() => true),
      Promise.resolve(false),
    ]);
  }

  /**
   * Create a custom HTTP client with specific configuration
   */
  createCustomClient(baseURL: string, defaultHeaders?: Record<string, string>) {
    return {
      get: <T = any>(path: string, options?: HttpClientOptions) => 
        this.get<T>(`${baseURL}${path}`, { ...options, headers: { ...defaultHeaders, ...options?.headers } }),
      
      post: <T = any>(path: string, data?: any, options?: HttpClientOptions) =>
        this.post<T>(`${baseURL}${path}`, data, { ...options, headers: { ...defaultHeaders, ...options?.headers } }),
      
      put: <T = any>(path: string, data?: any, options?: HttpClientOptions) =>
        this.put<T>(`${baseURL}${path}`, data, { ...options, headers: { ...defaultHeaders, ...options?.headers } }),
      
      delete: <T = any>(path: string, options?: HttpClientOptions) =>
        this.delete<T>(`${baseURL}${path}`, { ...options, headers: { ...defaultHeaders, ...options?.headers } }),
    };
  }
}