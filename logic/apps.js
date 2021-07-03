import * as diskLogic from './disk';
const NodeError = require('models/errors.js').NodeError;
export async function get(query) {
    let apps = await diskLogic.readAppRegistry();
    // Do all hidden service lookups concurrently
    await Promise.all(apps.map(async (app) => {
        try {
            app.hiddenService = await diskLogic.readHiddenService(`app-${app.id}`);
        }
        catch {
            app.hiddenService = '';
        }
    }));
    if (query.installed === true) {
        const installedApps = (await diskLogic.readUserFile()).installedApps || [];
        apps = apps.filter((app) => installedApps.includes(app.id));
    }
    return apps;
}
async function isValidAppId(id) {
    if (!id) {
        return false;
    }
    return true;
}
export async function install(id) {
    if (!await isValidAppId(id)) {
        throw new NodeError('Invalid app id');
    }
    try {
        await diskLogic.writeSignalFile(`app-install-${id}`);
    }
    catch {
        throw new NodeError('Could not write the signal file');
    }
}
export async function uninstall(id) {
    if (!await isValidAppId(id)) {
        throw new NodeError('Invalid app id');
    }
    try {
        await diskLogic.writeSignalFile(`app-uninstall-${id}`);
    }
    catch {
        throw new NodeError('Could not write the signal file');
    }
}
