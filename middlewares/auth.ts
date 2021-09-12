import {Buffer} from 'node:buffer';
import passport from 'passport';
import * as passportJWT from 'passport-jwt';
import * as passportHTTP from 'passport-http';
import bcrypt from '@node-rs/bcrypt';
import {NodeError} from '@runcitadel/utils';
import Rsa from 'node-rsa';
import {NextFunction, Request, Response} from 'express';
import type {user as userFile} from '@runcitadel/utils';
import * as authLogic from '../logic/auth.js';
import * as diskLogic from '../logic/disk.js';
import {STATUS_CODES} from '../utils/const.js';

const JwtStrategy = passportJWT.Strategy;
const BasicStrategy = passportHTTP.BasicStrategy;
const ExtractJwt = passportJWT.ExtractJwt;

const JWT_AUTH = 'jwt';
const REGISTRATION_AUTH = 'register';
const BASIC_AUTH = 'basic';

const SYSTEM_USER = 'admin';

const b64encode = (string: string) =>
  Buffer.from(string, 'utf-8').toString('base64');
const b64decode = (b64: string) => Buffer.from(b64, 'base64').toString('utf-8');

export async function generateJWTKeys(): Promise<void> {
  const key = new Rsa({b: 512});

  const privateKey = key.exportKey('private');
  const publicKey = key.exportKey('public');

  await diskLogic.writeJWTPrivateKeyFile(privateKey);
  await diskLogic.writeJWTPublicKeyFile(publicKey);
}

export async function createJwtOptions(): Promise<{
  jwtFromRequest: passportJWT.JwtFromRequestFunction;
  secretOrKey: string;
  algorithm: string;
}> {
  await generateJWTKeys();
  const pubKey = await diskLogic.readJWTPublicKeyFile();

  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
    secretOrKey: pubKey,
    algorithm: 'RS256',
  };
}

passport.serializeUser((user, done) => {
  done(null, SYSTEM_USER);
});

passport.use(
  BASIC_AUTH,
  new BasicStrategy((username, password, next) => {
    password = b64decode(password);
    const user = {
      username: SYSTEM_USER,
      password,
      plainTextPassword: password,
    };
    next(null, user);
  }),
);

const jwtOptions = await createJwtOptions();

passport.use(
  JWT_AUTH,
  new JwtStrategy(jwtOptions, (jwtPayload, done) => {
    done(null, {username: SYSTEM_USER});
  }),
);

passport.use(
  REGISTRATION_AUTH,
  new BasicStrategy((username, password, next) => {
    password = b64decode(password);
    const credentials = authLogic.hashCredentials(password);

    next(null, credentials);
  }),
);

// Override the authorization header with password that is in the body of the request if basic auth was not supplied.
export function convertRequestBodyToBasicAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (request.body.password && !request.headers.authorization) {
    // We need to Base64 encode because Passport breaks on ":" characters
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const password = b64encode(request.body.password);
    request.headers.authorization =
      'Basic ' + Buffer.from(SYSTEM_USER + ':' + password).toString('base64');
  }

  next();
}

export function basic(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  passport.authenticate(BASIC_AUTH, {session: false}, (error, user) => {
    function handleCompare(equal: boolean) {
      if (!equal) {
        next(new NodeError('Incorrect password', STATUS_CODES.UNAUTHORIZED));
        return;
      }

      request.logIn(user, (error_) => {
        if (error_) {
          next(
            new NodeError('Unable to authenticate', STATUS_CODES.UNAUTHORIZED),
          );
          return;
        }

        (next as (error: unknown, user: unknown) => void)(null, user);
      });
    }

    if (error || user === false) {
      next(new NodeError('Invalid state', STATUS_CODES.UNAUTHORIZED));
      return;
    }

    diskLogic
      .readUserFile()
      .then((userData: userFile) => {
        const storedPassword = userData.password;

        bcrypt
          .compare(
            (user as {[key: string]: unknown; password: string}).password,
            storedPassword!,
          )
          .then(handleCompare)
          .catch(next);
      })
      .catch(() => {
        next(new NodeError('No user registered', STATUS_CODES.UNAUTHORIZED));
      });
  })(request, response, next);
}

// eslint-enable @typescript-eslint/no-unsafe-member-access
export function jwt(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  passport.authenticate(JWT_AUTH, {session: false}, (error, user) => {
    if (error || user === false) {
      next(new NodeError('Invalid JWT', STATUS_CODES.UNAUTHORIZED));
      return;
    }

    request.logIn(user, (error_) => {
      if (error_) {
        next(
          new NodeError('Unable to authenticate', STATUS_CODES.UNAUTHORIZED),
        );
        return;
      }

      (next as (error: unknown, user: unknown) => void)(null, user);
    });
  })(request, response, next);
}

export async function accountJWTProtected(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const isRegistered = await authLogic.isRegistered();
  if (isRegistered) {
    passport.authenticate(JWT_AUTH, {session: false}, (error, user) => {
      if (error || user === false) {
        next(new NodeError('Invalid JWT', STATUS_CODES.UNAUTHORIZED));
        return;
      }

      request.logIn(user, (error_: Error) => {
        if (error_) {
          next(
            new NodeError('Unable to authenticate', STATUS_CODES.UNAUTHORIZED),
          );
          return;
        }

        (next as (error: unknown, user: unknown) => void)(null, user);
      });
    })(request, response, next);
  } else {
    (next as (error: unknown, user: unknown) => void)(null, 'not-registered');
  }
}

export function register(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  passport.authenticate(REGISTRATION_AUTH, {session: false}, (error, user) => {
    if (error || user === false) {
      next(new NodeError('Invalid state', STATUS_CODES.UNAUTHORIZED));
      return;
    }

    request.logIn(user, (error_) => {
      if (error_) {
        next(
          new NodeError('Unable to authenticate', STATUS_CODES.UNAUTHORIZED),
        );
        return;
      }

      (next as (error: unknown, user: unknown) => void)(null, user);
    });
  })(request, response, next);
}
