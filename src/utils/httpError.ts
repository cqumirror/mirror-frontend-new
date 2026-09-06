export const SUPPORTED_ERROR_CODES = new Set([403, 404, 405, 500, 502, 503, 504]);

/** 从适配器的 “HTTP xxx” 错误中保留可公开展示的状态码。 */
export const getHttpErrorCode = (error: unknown, fallback = 500): number => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const status = Number(message.match(/\bHTTP\s+(\d{3})\b/i)?.[1]);
  return SUPPORTED_ERROR_CODES.has(status) ? status : fallback;
};
