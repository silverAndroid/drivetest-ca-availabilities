import { createWriteStream } from "fs";

import dayjs from "dayjs";
import pino from "pino";
import pinoMulti from "pino-multi-stream";

const prettyStream = pinoMulti.prettyStream({
  prettyPrint: {
    ignore: "time",
  },
});

export const logger = pino(
  {
    level: "trace",
  },
  pinoMulti.multistream([
    { stream: prettyStream, level: "info" },
    {
      stream: createWriteStream(
        `./drivetest-${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.log`,
      ),
      level: "trace",
    },
  ]),
);
