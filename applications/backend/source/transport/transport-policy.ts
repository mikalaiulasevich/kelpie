import { HttpStatus } from '@nestjs/common';

export const TransportPolicy = {
  FrameworkHeader: 'x-powered-by',
  BodyParser: 'json',
  InputErrorStatuses: [
    HttpStatus.PAYLOAD_TOO_LARGE,
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  ],
  AllowCompressedBodies: false,
  ApiPrefix: 'api',
  JsonBodyLimit: '256kb',
  RequestTimeoutMilliseconds: 30_000,
  HeadersTimeoutMilliseconds: 15_000,
  KeepAliveTimeoutMilliseconds: 5_000,
} as const;
