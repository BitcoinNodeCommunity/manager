/* eslint-disable no-unused-vars, no-magic-numbers */
import * as logger from '../utils/logger';
function handleError(error, request, res, next) {
    const statusCode = error.statusCode || 500;
    const route = request.url || '';
    const message = error.message || '';
    logger.error(message, route, error.stack);
    res.status(statusCode).json(message);
}
module.exports = handleError;
