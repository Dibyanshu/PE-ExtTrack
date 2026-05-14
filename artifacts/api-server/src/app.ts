import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Global error handler — surfaces the real error message in development
app.use(
  (
    err: Error & { cause?: Error & { sqlMessage?: string; errno?: number; code?: string } },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const cause = err.cause;
    const detail = cause?.sqlMessage ?? cause?.message ?? "";
    const msg = process.env.NODE_ENV === "production"
      ? "Internal server error"
      : `${err.message}${detail ? ` | cause: ${detail}` : ""}`;
    logger.error({ err, cause }, "Unhandled error");
    res.status(500).json({ error: msg });
  },
);

export default app;
