/**
 * Generic disk functions.
 */
import * as fs from 'fs';
import * as crypto from "crypto";
import * as logger from '../utils/logger';
import * as fse from 'fs-extra';
const uint32Bytes = 4;
// Deletes a file from the filesystem
export function deleteFile(filePath) {
    return new Promise((resolve, reject) => fs.unlink(filePath, (error) => {
        if (error) {
            reject(error);
        }
        else {
            resolve();
        }
    }));
}
export async function copyFolder(fromFile, toFile) {
    return new Promise((resolve, reject) => fse.copy(fromFile, toFile, (error) => {
        if (error) {
            reject(error);
        }
        else {
            resolve();
        }
    }));
}
// Delete all items in a directory.
export async function deleteItemsInDir(path) {
    const contents = fs.readdirSync(path);
    for (const item of contents) {
        const curPath = path + '/' + item;
        if (fs.statSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
        }
        else {
            fs.unlinkSync(curPath);
        }
    }
}
export async function deleteFoldersInDir(path) {
    const contents = fs.readdirSync(path);
    for (const item of contents) {
        if (fs.statSync(path + '/' + item).isDirectory()) {
            deleteFolderRecursive(path + '/' + item);
        }
    }
}
export function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        const contents = fs.readdirSync(path);
        for (const file of contents) {
            const curPath = path + '/' + file;
            if (fs.statSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            }
            else {
                fs.unlinkSync(curPath);
            }
        }
        fs.rmdirSync(path);
    }
}
export async function listDirsInDir(dir) {
    const contents = fs.readdirSync(dir);
    const dirs = [];
    for (const item of contents) {
        if (fs.statSync(dir + '/' + item).isDirectory()) {
            dirs.push(item);
        }
    }
    return dirs;
}
export async function moveFoldersToDir(fromDir, toDir) {
    const contents = fs.readdirSync(fromDir);
    for (const item of contents) {
        if (item !== '.git' && fs.statSync(fromDir + '/' + item).isDirectory()) {
            await copyFolder(fromDir + '/' + item, toDir + '/' + item);
        }
    }
}
// Reads a file. Wraps fs.readFile into a native promise
export function readFile(filePath, encoding) {
    return new Promise((resolve, reject) => fs.readFile(filePath, encoding, (error, string) => {
        if (error) {
            reject(error);
        }
        else {
            resolve(string);
        }
    }));
}
// Reads a file as a utf8 string. Wraps fs.readFile into a native promise
export async function readUtf8File(filePath) {
    return (await readFile(filePath, 'utf8')).trim();
}
export async function readJsonFile(filePath) {
    return readUtf8File(filePath).then(JSON.parse);
}
// Writes a string to a file. Wraps fs.writeFile into a native promise
// This is _not_ concurrency safe, so don't export it without making it like writeJsonFile
export function writeFile(filePath, data, encoding) {
    return new Promise((resolve, reject) => fs.writeFile(filePath, data, encoding, error => {
        if (error) {
            reject(error);
        }
        else {
            resolve();
        }
    }));
}
// Like writeFile but will create the file if it doesn't already exist
export async function ensureWriteFile(filePath, data, encoding) {
    await fse.ensureFile(filePath);
    return await writeFile(filePath, data, encoding);
}
export function writeJsonFile(filePath, object) {
    const temporaryFileName = `${filePath}.${crypto.randomBytes(uint32Bytes).readUInt32LE(0)}`;
    return writeFile(temporaryFileName, JSON.stringify(object, null, 2), 'utf8')
        .then(() => new Promise((resolve, reject) => fs.rename(temporaryFileName, filePath, error => {
        if (error) {
            reject(error);
        }
        else {
            // @ts-expect-error
            resolve();
        }
    })))
        .catch(error => {
        if (error) {
            fs.unlink(temporaryFileName, error_ => {
                logger.warn('Error removing temporary file after error', 'disk', { err: error_, tempFileName: temporaryFileName });
            });
        }
        throw error;
    });
}
export function writeKeyFile(filePath, object) {
    const temporaryFileName = `${filePath}.${crypto.randomBytes(uint32Bytes).readUInt32LE(0)}`;
    return writeFile(temporaryFileName, object, 'utf8')
        .then(() => new Promise((resolve, reject) => fs.rename(temporaryFileName, filePath, error => {
        if (error) {
            reject(error);
        }
        else {
            // @ts-expect-error
            resolve();
        }
    })))
        .catch(error => {
        if (error) {
            fs.unlink(temporaryFileName, error_ => {
                logger.warn('Error removing temporary file after error', 'disk', { err: error_, tempFileName: temporaryFileName });
            });
        }
        throw error;
    });
}
module.exports = {
    deleteItemsInDir,
    deleteFile,
    deleteFoldersInDir,
    listDirsInDir,
    moveFoldersToDir,
    readFile,
    readUtf8File,
    readJsonFile,
    writeJsonFile,
    writeKeyFile,
    writeFile,
    ensureWriteFile
};
