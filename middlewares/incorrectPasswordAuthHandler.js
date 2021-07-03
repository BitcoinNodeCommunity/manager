/* eslint-disable no-unused-vars, no-magic-numbers */
import { NodeError } from '../models/errors';
const handleError = (err, _request, _res, next) => {
    // If a incorrect password was given, respond with 403 instead of 401.
    // Reasoning: sending 401 on a request such as when the user tries to
    // change password with an incorrect password or enters an incorrect
    // password to view seed will log him out due to interceptor on front-end
    if (err.message && err.message === 'Incorrect password') {
        return next(new NodeError('Incorrect password', 403));
    }
    return next();
};
export default handleError;
