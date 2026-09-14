import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import pinoHttp from "pino-http";
import pino from "pino";
import { env } from "./config/config/env";
import { logger } from "./utils/logger";
import { requestIdMiddleware } from "./config/middleware/requestIdMiddleware";
import {
  notFoundMiddleware,
  errorMiddleware,
} from "./config/middleware/errorMiddleware";
import { defaultRateLimiter } from "./config/middleware/rateLimitMiddleware";
import { swaggerSpec } from "./config/swagger";
import apiRoutes from "./routes";
import healthRoutes from "./routes/healthRoutes";
import opportunityRoutes from "./routes/opportunityRoutes";
import moderationRoutes from "./routes/moderationRoutes";
import adminUserRoutes from "./routes/adminUserRoutes";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes";
import reportRoutes from "./routes/reportRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId,
      autoLogging: {
        ignore: (req) => req.url?.startsWith("/api/v1/health") ?? false,
      },
      // The two storage routes carry a signed token as a query string
      // (they must work as bare links) — never let it reach log
      // storage, even though it's short-lived and scoped.
      serializers: {
        req(req) {
          const serialized = pino.stdSerializers.req(req);
          if (
            serialized.url?.includes("/resources/files/") &&
            serialized.url.includes("token=")
          ) {
            serialized.url = serialized.url.replace(
              /token=[^&]*/,
              "token=[REDACTED]",
            );
          }
          return serialized;
        },
      },
    }),
  );

  // Exact, explicit CORS origins only — never a wildcard with credentials.
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
        },
      },
      // This API is deliberately consumed by a separate frontend origin
      // (see the explicit CORS origins above), and resources/files/download
      // is designed to work as a bare link embedded via <img src> or
      // opened in a new tab from that origin. Helmet's same-origin CORP
      // default blocks exactly that (silently, for no-cors loads like
      // <img> — it doesn't affect the JSON fetch/XHR calls elsewhere,
      // which is why only images were affected). Auth/ownership checks
      // remain the real security boundary; this only controls whether
      // another origin may embed the response at all.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser(env.cookieSecret));

  app.use("/api/v1", defaultRateLimiter);

  // Swagger only in non-production, or behind auth in production — kept
  // simple here (dev/test only) per the foundation milestone's scope.
  if (!env.isProduction) {
    app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use("/api/v1", apiRoutes);
  app.use("/api/v1/opportunities", opportunityRoutes);
  app.use("/api/v1", moderationRoutes);
  app.use("/api/v1/admin/users", adminUserRoutes);
  app.use("/api/v1/admin", adminAnalyticsRoutes);
  app.use("/api/v1/reports", reportRoutes);
  app.use("/api/v1", auditLogRoutes);
  // Also expose /health and /version unversioned for simple infra probes.
  app.use(healthRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
