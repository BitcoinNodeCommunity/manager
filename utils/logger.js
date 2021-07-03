import * as winston from 'winston';
import { format } from 'winston';
import 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
const constants = require('utils/const.js');
const { combine, timestamp, printf } = format;
const getNamespace = require('continuation-local-storage').getNamespace;
const LOCAL = 'local';
const logDir = './logs';
const ENV = process.env.NODE_ENV;
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
const appendCorrelationId = format((info, options) => {
    const apiRequest = getNamespace(constants.REQUEST_CORRELATION_NAMESPACE_KEY);
    if (apiRequest) {
        info.internalCorrelationId = apiRequest.get(constants.REQUEST_CORRELATION_ID_KEY);
    }
    return info;
});
const errorFileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '10m',
    maxFiles: '7d'
});
const apiFileTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '7d'
});
const localLogFormat = printf(info => {
    let data = '';
    if (info.data) {
        data = JSON.stringify({ data: info.data });
    }
    return `${info.timestamp} ${info.level.toUpperCase()}: ${info.internalCorrelationId} [${info._module}] ${info.message} ${data}`;
});
const localLoggerTransports = [
    errorFileTransport,
    apiFileTransport
];
if (ENV === 'development') {
    localLoggerTransports.push(new winston.transports.Console());
}
winston.loggers.add(LOCAL, {
    level: 'info',
    format: combine(timestamp(), appendCorrelationId(), localLogFormat),
    transports: localLoggerTransports
});
export const morganConfiguration = {
    stream: {
        write(message) {
            info(message, 'umbrel-manager', '');
        }
    }
};
const localLogger = winston.loggers.get(LOCAL);
export function printToStandardOut(data) {
    if (data) {
        console.log(data);
    }
}
export function error(message, _module, data) {
    printToStandardOut(message);
    printToStandardOut(_module);
    printToStandardOut(data);
    localLogger.error(message, {
        _module,
        data
    });
}
export function warn(message, _module, data) {
    printToStandardOut(message);
    printToStandardOut(_module);
    printToStandardOut(data);
    localLogger.warn(message, {
        _module,
        data
    });
}
export function info(message, _module, data) {
    printToStandardOut(message);
    printToStandardOut(_module);
    printToStandardOut(data);
    localLogger.info(message, {
        _module,
        data
    });
}
export function debug(message, _module, data) {
    printToStandardOut(message);
    printToStandardOut(_module);
    printToStandardOut(data);
    localLogger.debug(message, {
        _module,
        data
    });
}
