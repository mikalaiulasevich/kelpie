import { HttpStatus } from '@nestjs/common';

export const TransportPolicy = {
  RateLimitCacheSize: 10_000,
  MaximumPublicIssues: 30,
  JsonMediaType: 'application/json',
  InputErrorCodes: {
    FST_ERR_CTP_BODY_TOO_LARGE: HttpStatus.PAYLOAD_TOO_LARGE,
    FST_ERR_CTP_EMPTY_JSON_BODY: HttpStatus.BAD_REQUEST,
    FST_ERR_CTP_INVALID_JSON_BODY: HttpStatus.BAD_REQUEST,
    FST_ERR_CTP_INVALID_CONTENT_LENGTH: HttpStatus.BAD_REQUEST,
    FST_ERR_CTP_INVALID_MEDIA_TYPE: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
  },
  IdentityEncoding: 'identity',
  Utf8Charset: 'utf-8',
  CharsetPattern: /;\s*charset\s*=\s*(?:"([^"]*)"|([^;]*))/gi,
  PrototypePoisoning: 'error',
  ConstructorPoisoning: 'error',
  ApiPrefix: 'api',
  JsonBodyLimit: 256 * 1024,
  RequestTimeoutMilliseconds: 30_000,
  HeadersTimeoutMilliseconds: 15_000,
  KeepAliveTimeoutMilliseconds: 5_000,
} as const;

export const PublicErrorCode = {
  InvalidRequest: 'invalid_request',
  Unauthorized: 'unauthorized',
  Forbidden: 'forbidden',
  NotFound: 'not_found',
  Conflict: 'conflict',
  PayloadTooLarge: 'payload_too_large',
  UnsupportedMediaType: 'unsupported_media_type',
  Unprocessable: 'unprocessable_request',
  RateLimited: 'rate_limited',
  Unavailable: 'unavailable',
  Internal: 'internal_error',
} as const;

export const PublicStatusCodes: ReadonlyDictionary<number, string> = {
  [HttpStatus.BAD_REQUEST]: PublicErrorCode.InvalidRequest,
  [HttpStatus.UNAUTHORIZED]: PublicErrorCode.Unauthorized,
  [HttpStatus.FORBIDDEN]: PublicErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: PublicErrorCode.NotFound,
  [HttpStatus.CONFLICT]: PublicErrorCode.Conflict,
  [HttpStatus.PAYLOAD_TOO_LARGE]: PublicErrorCode.PayloadTooLarge,
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: PublicErrorCode.UnsupportedMediaType,
  [HttpStatus.UNPROCESSABLE_ENTITY]: PublicErrorCode.Unprocessable,
  [HttpStatus.TOO_MANY_REQUESTS]: PublicErrorCode.RateLimited,
  [HttpStatus.SERVICE_UNAVAILABLE]: PublicErrorCode.Unavailable,
} as const;
