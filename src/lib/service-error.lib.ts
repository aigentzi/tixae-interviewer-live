export class ServiceError extends Error {
  comingFrom: string;

  constructor(message: string, comingFrom: string) {
    super(message);
    this.comingFrom = comingFrom;
  }

  serialize(): { message: string; comingFrom: string } {
    return {
      message: this.message,
      comingFrom: this.comingFrom,
    };
  }

  static fromError(error: unknown, comingFrom: string): ServiceError {
    if (error instanceof ServiceError) {
      return error;
    }

    if (error instanceof Error) {
      return new ServiceError(error.message, comingFrom);
    }

    return new ServiceError(String(error), comingFrom);
  }

  public formatMessage(): string {
    return this.comingFrom + ": " + this.message;
  }
}
