import { logger } from "./lib/logger";
import { bootApp, getRequiredPort } from "./lib/server-bootstrap";

const port = getRequiredPort();

bootApp()
  .then((app) => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup migrations failed");
    process.exit(1);
  });
