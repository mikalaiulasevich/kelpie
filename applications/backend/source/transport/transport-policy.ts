import { HttpStatus } from '@nestjs/common';

export const TransportPolicy = {
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
