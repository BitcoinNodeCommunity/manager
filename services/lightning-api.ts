import * as process from 'node:process';
import {Middleware} from '@runcitadel/sdk';

const lnapiUrl = process.env.MIDDLEWARE_API_URL ?? 'http://localhost';
const lnapiPort = process.env.MIDDLEWARE_API_PORT ?? 3005;
const middleware = new Middleware(`${lnapiUrl}:${lnapiPort}`);

export async function initializeWallet(
  seed: string[],
  jwt: string,
): Promise<void> {
  middleware.jwt = jwt;
  await middleware.lnd.wallet.init(seed);
}

export async function signMessage(
  message: string,
  jwt: string,
): Promise<string> {
  middleware.jwt = jwt;
  return middleware.lnd.signMessage(message);
}

export async function getImplementation(jwt: string) {
  middleware.jwt = jwt;
  return (await middleware.lnd.info.version()).implementation.toLowerCase();
}
