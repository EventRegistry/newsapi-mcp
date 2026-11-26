#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import express from "express";
import type { Express } from "express";
import {
  getOAuthProtectedResourceMetadataUrl,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
  createMcpHandler,
  OAuthError,
  OAuthErrorCode,
} from "@modelcontextprotocol/server";
import type { OAuthProtectedResourceMetadata } from "@modelcontextprotocol/server";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";
import { withAccessToken } from "./client.js";
import { discoverOpenId } from "./oauth.js";
import { createServer } from "./server.js";

export interface HttpConfig {
  /** URL clients connect to; also the `aud` tokens must carry. */
  publicUrl: URL;
  /** OAuth issuer that signs in users and issues their tokens. */
  issuer: string;
  port: number;
}

/** Read the hosted server's configuration from environment variables. */
export function loadConfig(env: NodeJS.ProcessEnv): HttpConfig {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be a port number, got "${env.PORT}"`);
  }
  return {
    publicUrl: new URL(env.MCP_PUBLIC_URL ?? "https://mcp.newsapi.ai/mcp"),
    issuer: env.MCP_AUTH_ISSUER ?? "https://auth.id.eventregistry.org",
    port,
  };
}

/** Find the issuer's JWKS URL from its OpenID Connect discovery document. */
export async function discoverJwksUri(issuer: string): Promise<URL> {
  const doc = await discoverOpenId(issuer);
  if (typeof doc.jwks_uri !== "string") {
    throw new Error(`OpenID configuration of ${issuer} has no jwks_uri`);
  }
  return new URL(doc.jwks_uri);
}

/** JWKS of the issuer, discovered on first use and retried until it works. */
function issuerJwks(issuer: string): JWTVerifyGetKey {
  let jwks: Promise<JWTVerifyGetKey> | undefined;
  return async (header, token) => {
    jwks ??= discoverJwksUri(issuer)
      .then((uri) => createRemoteJWKSet(uri))
      .catch((err) => {
        jwks = undefined;
        throw err;
      });
    return (await jwks)(header, token);
  };
}

// Failures that mean the token is bad, not that the issuer is unreachable.
const TOKEN_ERRORS = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
];

/** Verify access tokens as JWTs signed by the issuer for this server. */
export function createJwtVerifier(options: {
  issuer: string;
  audience: string;
  jwks: JWTVerifyGetKey;
}): OAuthTokenVerifier {
  const { issuer, audience, jwks } = options;
  return {
    async verifyAccessToken(token) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer,
          audience,
          requiredClaims: ["exp"],
        });
        const clientId = payload.client_id ?? payload.azp;
        // Ory Hydra lists scopes in a `scp` array; RFC 9068 uses a `scope` string.
        const scopes = Array.isArray(payload.scp)
          ? payload.scp.filter((s): s is string => typeof s === "string")
          : typeof payload.scope === "string"
            ? payload.scope.split(" ").filter(Boolean)
            : [];
        return {
          token,
          clientId: typeof clientId === "string" ? clientId : "",
          scopes,
          expiresAt: payload.exp,
        };
      } catch (err) {
        if (TOKEN_ERRORS.some((E) => err instanceof E)) {
          // The SDK puts this text in a quoted WWW-Authenticate parameter.
          const reason = (err as Error).message.replaceAll('"', "'");
          throw new OAuthError(OAuthErrorCode.InvalidToken, reason);
        }
        throw err;
      }
    },
  };
}

/** Build the hosted server's express app: stateless MCP route behind OAuth. */
export function createHttpApp(options: {
  publicUrl: URL;
  issuer: string;
  verifier: OAuthTokenVerifier;
}): Express {
  const { publicUrl, issuer, verifier } = options;
  const mcpPath = publicUrl.pathname;
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(publicUrl);
  const resourceMetadata: OAuthProtectedResourceMetadata = {
    resource: publicUrl.href,
    authorization_servers: [issuer],
    scopes_supported: ["mcp", "offline_access"],
    bearer_methods_supported: ["header"],
    resource_name: "NewsAPI.ai",
  };

  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  // RFC 9728 path-specific URL, plus the root for clients that only try that.
  for (const path of new Set([
    new URL(resourceMetadataUrl).pathname,
    "/.well-known/oauth-protected-resource",
  ])) {
    app.get(path, (_req, res) => {
      res.json(resourceMetadata);
    });
  }

  // stateless: a fresh server per request; GET and DELETE answer 405
  const onerror = (err: Error) =>
    console.error("Error handling MCP request:", err);
  const mcpHandler = toNodeHandler(
    createMcpHandler(() => createServer({ hosted: true }), {
      legacy: "stateless",
      onerror,
    }),
    { onerror },
  );
  app.all(
    mcpPath,
    requireBearerAuth({ verifier, resourceMetadataUrl }),
    (req, res) =>
      withAccessToken(req.auth!.token, () => mcpHandler(req, res, req.body)),
  );

  return app;
}

async function main() {
  const config = loadConfig(process.env);
  const verifier = createJwtVerifier({
    issuer: config.issuer,
    audience: config.publicUrl.href,
    jwks: issuerJwks(config.issuer),
  });
  const app = createHttpApp({ ...config, verifier });
  app.listen(config.port, () => {
    console.error(
      `NewsAPI.ai hosted server on port ${config.port}, serving ${config.publicUrl.href}`,
    );
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
