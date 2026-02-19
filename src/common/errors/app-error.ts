export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, public readonly provider: string) {
    super(`AI Provider (${provider}): ${message}`, 502);
  }
}

export class CMSPublishError extends AppError {
  constructor(message: string, public readonly provider: string) {
    super(`CMS (${provider}): ${message}`, 502);
  }
}
