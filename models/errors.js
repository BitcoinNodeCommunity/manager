/* eslint-disable no-magic-numbers */
export class NodeError extends Error {
    constructor(message, statusCode) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.statusCode = statusCode;
    }
}
export class ValidationError extends Error {
    constructor(message, statusCode) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
        this.statusCode = statusCode || 400;
    }
}
