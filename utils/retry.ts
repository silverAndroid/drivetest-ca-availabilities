import { Page } from "puppeteer";

import { logger } from "~cli/logger";

/**
 *
 * @param maxRetries if maxRetries is 0, it will keep trying infinitely
 */
export async function retryIfFail<T>(
  fn: (...args: any[]) => T,
  fnArgs: [Page, ...any[]],
  { useAllArgs = false, maxRetries = 3, waitAfterFailMs = 1000 } = {},
) {
  let i = 0;
  const [page, ...args] = fnArgs;
  while (maxRetries !== 0 && i < maxRetries) {
    try {
      logger.debug("Attempt %d: calling %s", i + 1, fn.name);
      const value = await fn(...(useAllArgs ? fnArgs : args));
      logger.debug("Called %s successfully", fn.name);
      return value;
    } catch (error: any) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("browser has disconnected") ||
        errorMessage.includes("target closed")
      ) {
        throw error;
      }

      const seconds = waitAfterFailMs / 1000;
      logger.error(
        "Attempt %d to call %s failed...waiting %d %s",
        i + 1,
        fn.name,
        seconds,
        seconds === 1 ? "second" : "seconds",
      );
      logger.debug("%s", error.stack);
      await page.waitForTimeout(waitAfterFailMs);
    }
    i++;
  }

  throw new Error(
    `All ${maxRetries} attempts failed. Couldn't call ${fn.name} successfully`,
  );
}
