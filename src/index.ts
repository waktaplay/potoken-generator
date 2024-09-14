import figlet from "figlet";

import { JSDOM } from "jsdom";
import {
  BG,
  BGError,
  type BgConfig,
  type DescrambledChallenge,
} from "bgutils-js";
import { Innertube } from "youtubei.js/web";

import { color } from "./utils/color";
import { REQUEST_KEY } from "./utils/constants";

const PORT = 3000;

console.log(figlet.textSync("BotGuard", { font: "Standard" }));
console.log("--------------------------------------------------------------");

////////////////////////////////////////////////////////////
// #region Initialise BotGuard

let innertube: Innertube;
let challenge: DescrambledChallenge | undefined;
let bgConfig: BgConfig = {
  fetch,
  globalObj: globalThis,
  identifier: "",
  requestKey: REQUEST_KEY,
};

let reloadInterval: Timer;

async function initialiseBotGuard() {
  const dom = new JSDOM();
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
  });

  innertube = await Innertube.create({ retrieve_player: false });
  bgConfig = {
    ...bgConfig,
    identifier: innertube.session.context.client.visitorData!,
  };

  challenge = await BG.Challenge.create(bgConfig);

  if (!challenge) {
    console.error(`${color("red", "[ERROR]")} Failed to create a challenge.`);
    process.exit(1);
  }

  if (challenge.script) {
    const script = challenge.script.find((sc) => sc);

    if (script) {
      new Function(script)();

      if (!reloadInterval) {
        console.info(`${color("blue", "[INFO]")} BotGuard is ready.`);
      } else {
        console.info(`${color("blue", "[INFO]")} BotGuard has been reloaded.`);
      }
    }
  } else {
    console.error(`${color("red", "[ERROR]")} Challenge script not found.`);
    process.exit(1);
  }

  if (!reloadInterval) {
    reloadInterval = setInterval(initialiseBotGuard, 1000 * 60 * 5);
  }
}

await initialiseBotGuard();

// #endregion
////////////////////////////////////////////////////////////
// #region Initialise Server

Bun.serve({
  port: PORT,
  async fetch() {
    const response = await generateSession();

    return new Response(JSON.stringify(response), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});

console.info(`${color("blue", "[INFO]")} Server is running on port ${PORT}.`);

// #endregion
////////////////////////////////////////////////////////////
// #region Functions

async function generateSession() {
  if (!challenge) {
    return {
      code: "BOTGUARD_CHALLENGE_NOT_READY",
      status: 503,
      message:
        "The BotGuard challenge is not ready or has failed. Contact the administrator for assistance.",
      responseAt: new Date().toISOString(),
    };
  }

  if (bgConfig.identifier === "") {
    return {
      code: "BOTGUARD_IDENTIFIER_NOT_FOUND",
      status: 503,
      message:
        "The BotGuard identifier is not generated or has failed. Contact the administrator for assistance.",
      responseAt: new Date().toISOString(),
    };
  }

  try {
    const poToken = await BG.PoToken.generate({
      program: challenge.challenge,
      globalName: challenge.globalName,
      bgConfig,
    });

    return {
      code: "OPERATION_COMPLETE",
      status: 200,
      data: {
        poToken: poToken,
        visitorData: bgConfig.identifier,
      },
      responseAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`${color("red", "[ERROR]")} ${error}`);

    return {
      code: "INTERNAL_PROCESSING_ERROR",
      status: 500,
      message:
        "An internal processing error occurred. Contact the administrator for assistance.",
      error:
        error instanceof BGError
          ? {
              code: error.code,
              message: error.message,
            }
          : error,
      responseAt: new Date().toISOString(),
    };
  }
}
