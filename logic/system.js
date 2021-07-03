import fetch from 'node-fetch';
import { gt, satisfies, minVersion } from 'semver';
import { encode } from 'lndconnect';
import * as diskLogic from './disk';
import constants from '../utils/const';
import { NodeError } from '../models/errors';
export async function getInfo() {
    try {
        const info = await diskLogic.readUmbrelVersionFile();
        return info;
    }
    catch {
        throw new NodeError('Unable to get system information');
    }
}
export async function getHiddenServiceUrl() {
    try {
        const url = await diskLogic.readHiddenService('web');
        return url;
    }
    catch {
        throw new NodeError('Unable to get hidden service url');
    }
}
export async function getElectrumConnectionDetails() {
    try {
        const address = await diskLogic.readElectrumHiddenService();
        const port = constants.ELECTRUM_PORT;
        const connectionString = `${address}:${port}:t`;
        return {
            address,
            port,
            connectionString
        };
    }
    catch {
        throw new NodeError('Unable to get Electrum hidden service url');
    }
}
export async function getBitcoinP2PConnectionDetails() {
    try {
        const address = await diskLogic.readBitcoinP2PHiddenService();
        const port = constants.BITCOIN_P2P_PORT;
        const connectionString = `${address}:${port}`;
        return {
            address,
            port,
            connectionString
        };
    }
    catch {
        throw new NodeError('Unable to get Bitcoin P2P hidden service url');
    }
}
export async function getBitcoinRPCConnectionDetails() {
    try {
        const [user, hiddenService] = await Promise.all([
            diskLogic.readUserFile(),
            diskLogic.readBitcoinRPCHiddenService()
        ]);
        const label = encodeURIComponent(`${user.name}'s Umbrel`);
        const rpcuser = constants.BITCOIN_RPC_USER;
        const rpcpassword = constants.BITCOIN_RPC_PASSWORD;
        const address = hiddenService;
        const port = constants.BITCOIN_RPC_PORT;
        const connectionString = `btcrpc://${rpcuser}:${rpcpassword}@${address}:${port}?label=${label}`;
        return {
            rpcuser,
            rpcpassword,
            address,
            port,
            connectionString
        };
    }
    catch {
        throw new NodeError('Unable to get Bitcoin RPC connection details');
    }
}
export async function getAvailableUpdate() {
    try {
        const current = await diskLogic.readUmbrelVersionFile();
        const currentVersion = current.version;
        // 'tag' should be master to begin with
        let tag = 'master';
        let data;
        let isNewVersionAvailable = true;
        let isCompatibleWithCurrentVersion = false;
        // Try finding for a new update until there's a new version available
        // which is compatible with the currently installed version
        while (isNewVersionAvailable && !isCompatibleWithCurrentVersion) {
            const infoUrl = `https://raw.githubusercontent.com/${constants.GITHUB_REPO}/${tag}/info.json`;
            const latestVersionInfo = await fetch(infoUrl);
            data = await latestVersionInfo.json();
            const latestVersion = data.version;
            const requiresVersionRange = data.requires;
            // A new version is available if the latest version > local version
            isNewVersionAvailable = gt(latestVersion, currentVersion);
            // It's compatible with the current version if current version
            // satisfies the 'requires' condition of the new version
            isCompatibleWithCurrentVersion = satisfies(currentVersion, requiresVersionRange);
            // Calculate the minimum required version
            const minimumVersionRequired = `v${minVersion(requiresVersionRange)}`;
            // If the minimum required version is what we just checked for, exit
            // This usually happens when an OTA update breaking release x.y.z is made
            // that also has x.y.z as the minimum required version
            if (tag === minimumVersionRequired) {
                break;
            }
            // Update tag to the minimum required version for the next loop run
            tag = minimumVersionRequired;
        }
        if (isNewVersionAvailable && isCompatibleWithCurrentVersion) {
            return data;
        }
        return 'Your Umbrel is up-to-date';
    }
    catch {
        throw new NodeError('Unable to check for update');
    }
}
export async function getUpdateStatus() {
    try {
        const status = await diskLogic.readUpdateStatusFile();
        return status;
    }
    catch {
        throw new NodeError('Unable to get update status');
    }
}
export async function startUpdate() {
    let availableUpdate;
    // Fetch available update
    try {
        availableUpdate = await getAvailableUpdate();
        if (!availableUpdate.version) {
            return availableUpdate;
        }
    }
    catch {
        throw new NodeError('Unable to fetch latest release');
    }
    // Make sure an update is not already in progress
    const updateInProgress = await diskLogic.updateLockFileExists();
    if (updateInProgress) {
        throw new NodeError('An update is already in progress');
    }
    // Update status file with update version
    try {
        const updateStatus = await diskLogic.readUpdateStatusFile();
        updateStatus.updateTo = `v${availableUpdate.version}`;
        await diskLogic.writeUpdateStatusFile(updateStatus);
    }
    catch {
        throw new NodeError('Could not update the update-status file');
    }
    // Write update signal file
    try {
        await diskLogic.writeUpdateSignalFile();
        return { message: 'Updating to Umbrel v' + availableUpdate.version };
    }
    catch {
        throw new NodeError('Unable to write update signal file');
    }
}
export async function getBackupStatus() {
    try {
        const status = await diskLogic.readBackupStatusFile();
        return status;
    }
    catch {
        throw new NodeError('Unable to get backup status');
    }
}
export async function getLndConnectUrls() {
    let cert;
    try {
        cert = await diskLogic.readLndCert();
    }
    catch {
        throw new NodeError('Unable to read lnd cert file');
    }
    let macaroon;
    try {
        macaroon = await diskLogic.readLndAdminMacaroon();
    }
    catch {
        throw new NodeError('Unable to read lnd macaroon file');
    }
    let restTorHost;
    try {
        restTorHost = await diskLogic.readLndRestHiddenService();
        restTorHost += ':8080';
    }
    catch {
        throw new NodeError('Unable to read lnd REST hostname file');
    }
    const restTor = encode({
        host: restTorHost,
        cert,
        macaroon
    });
    let grpcTorHost;
    try {
        grpcTorHost = await diskLogic.readLndGrpcHiddenService();
        grpcTorHost += ':10009';
    }
    catch {
        throw new NodeError('Unable to read lnd gRPC hostname file');
    }
    const grpcTor = encode({
        host: grpcTorHost,
        cert,
        macaroon
    });
    const restLocalHost = `${constants.DEVICE_HOSTNAME}:8080`;
    const restLocal = encode({
        host: restLocalHost,
        cert,
        macaroon
    });
    const grpcLocalHost = `${constants.DEVICE_HOSTNAME}:10009`;
    const grpcLocal = encode({
        host: grpcLocalHost,
        cert,
        macaroon
    });
    return {
        restTor,
        restLocal,
        grpcTor,
        grpcLocal
    };
}
export async function requestDebug() {
    try {
        await diskLogic.writeSignalFile('debug');
        return 'Debug requested';
    }
    catch {
        throw new NodeError('Could not write the signal file');
    }
}
export async function getDebugResult() {
    try {
        return await diskLogic.readDebugStatusFile();
    }
    catch {
        throw new NodeError('Unable to get debug results');
    }
}
export async function requestShutdown() {
    try {
        await diskLogic.shutdown();
        return 'Shutdown requested';
    }
    catch {
        throw new NodeError('Unable to request shutdown');
    }
}
export async function requestReboot() {
    try {
        await diskLogic.reboot();
        return 'Reboot requested';
    }
    catch {
        throw new NodeError('Unable to request reboot');
    }
}
export async function status() {
    try {
        const highMemoryUsage = await diskLogic.memoryWarningStatusFileExists();
        return {
            highMemoryUsage
        };
    }
    catch {
        throw new NodeError('Unable check system status');
    }
}
export async function clearMemoryWarning() {
    try {
        await diskLogic.deleteMemoryWarningStatusFile();
        return 'High memory warning dismissed';
    }
    catch {
        throw new NodeError('Unable to dismiss high memory warning');
    }
}
