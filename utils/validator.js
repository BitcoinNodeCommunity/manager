const validator = require('validator');
const ValidationError = require('models/errors.js').ValidationError;
// Max length is listed here,
// https://github.com/lightningnetwork/lnd/blob/fd1f6a7bc46b1e50ff3879b8bd3876d347dbb73d/channeldb/invoices.go#L84
const MAX_MEMO_LENGTH = 1024;
const MIN_PASSWORD_LENGTH = 12;
export function isAlphanumeric(string) {
    isDefined(string);
    if (!validator.isAlphanumeric(string)) {
        throw new ValidationError('Must include only alpha numeric characters.');
    }
}
export function isAlphanumericAndSpaces(string) {
    isDefined(string);
    if (!validator.matches(string, '^[a-zA-Z0-9\\s]*$')) {
        throw new ValidationError('Must include only alpha numeric characters and spaces.');
    }
}
export function isBoolean(value) {
    if (value !== true && value !== false) {
        throw new ValidationError('Must be true or false.');
    }
}
export function isDecimal(amount) {
    if (!validator.isDecimal(amount)) {
        throw new ValidationError('Must be decimal.');
    }
}
export function isDefined(object) {
    if (object === undefined) {
        throw new ValidationError('Must define variable.');
    }
}
export function isMinPasswordLength(password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw new ValidationError('Must be ' + MIN_PASSWORD_LENGTH + ' or more characters.');
    }
}
export function isPositiveInteger(amount) {
    if (!validator.isInt(String(amount), { gt: 0 })) {
        throw new ValidationError('Must be positive integer.');
    }
}
export function isPositiveIntegerOrZero(amount) {
    if (!validator.isInt(String(amount), { gt: -1 })) {
        throw new ValidationError('Must be positive integer.');
    }
}
export function isString(object) {
    if (typeof object !== 'string') {
        throw new ValidationError('Object must be of type string.');
    }
}
export function isValidMemoLength(string) {
    if (Buffer.byteLength(string, 'utf8') > MAX_MEMO_LENGTH) {
        throw new ValidationError('Must be less than ' + MAX_MEMO_LENGTH + ' bytes.');
    }
}
