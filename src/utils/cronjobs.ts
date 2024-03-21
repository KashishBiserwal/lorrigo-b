import axios from "axios";
import { B2COrderModel } from "../models/order.model";
import config from "./config";
import APIs from "./constants/third_party_apis";
import { getSmartShipToken } from "./helpers";
import * as cron from "node-cron";
import EnvModel from "../models/env.model";
import https from "node:https";
import Logger from "./logger";
import redis from "../models/redis";
import { trackShipment } from "../controllers/shipment.controller";
import { RequiredTrackResponse, TrackResponse } from "../types/b2c";

/**
 * Update order with statusCode (2) to cancelled order(3)
 * prints Error if occurred during this process
 * @returns Promise(void)
 */
const CANCEL_REQUESTED_ORDER = async (): Promise<void> => {
  // get all order with statusCode 2,
  const orderUnderCancellation = await B2COrderModel.find({ orderStage: 2 });
  const order_referenceIds4smartship = orderUnderCancellation.map(
    (order) => order._id + "_" + order.order_reference_id
  );

  // hit cancellation api
  const requestBody = {
    request_info: {},
    orders: {
      client_order_reference_ids: order_referenceIds4smartship,
    },
  };
  const smartshipToken = await getSmartShipToken();
  if (!smartshipToken) {
    return Logger.warn("FAILED TO RUN JOB, SMARTSHIPTOKEN NOT FOUND");
  }
  const apiUrl = config.SMART_SHIP_API_BASEURL + APIs.CANCEL_SHIPMENT;
  const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };

  const responseJSON = await (await axios.post(apiUrl, requestBody, shipmentAPIConfig)).data;

  const order_cancellation_details = responseJSON?.data?.order_cancellation_details;
  const failures = order_cancellation_details?.failure;
  let cancelled_order;
  if (failures) {
    const failureKeys = Object.keys(failures);
    // finding order_reference_ids with message: "Already Cancelled."
    cancelled_order = failureKeys
      .filter((key) => {
        return failures[key]?.message === "Already Cancelled.";
      })
      .map((key) => {
        return key.split("_")[1];
      });
  }
  // update db
  const findQuery = { order_reference_id: { $in: cancelled_order } };
  const ack = await B2COrderModel.updateMany(findQuery, { orderStage: 3 });
  Logger.plog("cronjob executed");
  Logger.log(ack);
};

export const CONNECT_SMARTSHIP = () => {
  const requestBody = {
    username: config.SMART_SHIP_USERNAME,
    password: config.SMART_SHIP_PASSWORD,
    client_id: config.SMART_SHIP_CLIENT_ID,
    client_secret: config.SMART_SHIP_CLIENT_SECRET,
    grant_type: config.SMART_SHIP_GRANT_TYPE,
  };
  axios
    .post("https://oauth.smartship.in/loginToken.php", requestBody)
    .then((r) => {
      Logger.log("SmartShip API response: " + JSON.stringify(r.data));
      const responseBody = r.data;
      const savedEnv = new EnvModel({ name: "SMARTSHIP", ...responseBody });
      EnvModel.deleteMany({ name: "SMARTSHIP" })
        .then(() => {
          //@ts-ignore
          const token = `${savedEnv?.token_type} ${savedEnv?.access_token}`;
          console.log("token: ", token);
          // redis.set("token:smartship", token);
          // redis.expire("token:smartship", 3600, (err) => {
          //   if (err) {
          //     Logger.warn(err);
          //   } else {
          //     Logger.log("smartship token cached.");
          //   }
          // });
          savedEnv
            .save()
            .then((r) => {
              Logger.plog("SMARTSHIP ENVs, updated successfully");
            })
            .catch((err) => {
              Logger.log("Error: while adding environment variable to ENV Document");
              Logger.log(err);
            });
        })
        .catch((err) => {
          Logger.log("Failed to clean up environment variables Document");
          Logger.log(err);
        });
    })
    .catch((err) => {
      Logger.err("Error, smartship:" + JSON.stringify(err?.response?.data));
    });
};

/**
 * function to get SMARTR token and save it into the database
 * @return void
 */
export const CONNECT_SMARTR = async (): Promise<void> => {
  let requestBody = {
    username: config.SMARTR_USERNAME,
    password: config.SMARTR_PASSWORD,
  };

  try {
    const response = await axios.post("https://uat.smartr.in/api/v1/get-token/", requestBody, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Set to true to verify the certificate
      }),
    });
    const responseJSON = response.data;
    if (responseJSON.success === true && responseJSON.message === "Logged In!") {
      const deleteENV = await EnvModel.deleteOne({ name: "SMARTR" }).lean();
      // if (deleteENV.deletedCount) {
      const env = new EnvModel({ name: "SMARTR", ...responseJSON });
      //@ts-ignore
      const token = env?.data?.token_type + " " + env?.data?.access_token;
      // redis.set("token:smartr", token);
      // redis.expire("token:smartr", 36000, (err, next) => {
      //   if (err) {
      //     Logger.warn("failed to set ttl to token:smartr");
      //   } else {
      //     Logger.log("SMARTr, ttl expiration set");
      //   }
      // });
      const savedEnv = await env.save();
      Logger.plog("SMARTR LOGGEDIN: " + JSON.stringify(savedEnv));
      // }
    } else {
      Logger.log("ERROR, smartr: " + JSON.stringify(responseJSON));
    }
  } catch (err) {
    Logger.err("SOMETHING WENT WRONG:");
    Logger.err(err);
  }
};
/**
 * function to run CronJobs currrently one cron is scheduled to update the status of order which are cancelled to "Already Cancelled".
 * @emits CANCEL_REQUESTED_ORDER
 * @returns void
 */
export const trackOrder = async () => {
  // Your code to make API request goes here
  // const orderReferenceId = req.query?.id;
  // if (!orderReferenceId) return res.status(200).send({ valid: false, message: "orderReferenceId required" });

  // const orderWithOrderReferenceId = await B2COrderModel.findOne({ order_reference_id: orderReferenceId }).lean();
  // if (!orderWithOrderReferenceId) {
  //   return res.status(200).send({ valid: false, message: "order doesn't exists" });
  // }

  // const smartshipToken = await getSmartShipToken();
  // if (!smartshipToken) return res.status(200).send({ valid: false, message: "Smarthship ENVs not found" });

  // const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };
  // try {
  //   const apiUrl = `${config.SMART_SHIP_API_BASEURL}${APIs.TRACK_SHIPMENT}=${orderWithOrderReferenceId._id + "_" + orderReferenceId
  //     }`;
  //   const response = await axios.get(apiUrl, shipmentAPIConfig);

  //   const responseJSON: TrackResponse = response.data;
  //   console.log(responseJSON.data.scans, "responseJSON")
  //   if (responseJSON.message === "success") {
  //     const keys: string[] = Object.keys(responseJSON.data.scans);
  //     const requiredResponse: RequiredTrackResponse = responseJSON.data.scans[keys[0]][0];
  //     return res.status(200).send({
  //       valid: true,
  //       response: {
  //         order_reference_id: requiredResponse?.order_reference_id?.split("_")[1],
  //         carrier_name: requiredResponse?.carrier_name,
  //         order_date: requiredResponse?.order_date,
  //         action: requiredResponse?.action,
  //         status_description: requiredResponse?.status_description,
  //       },
  //     });
  //   } else {
  //     return res.status(500).send({ valid: false, message: "Something went wrong", response: responseJSON });
  //   }
  // } catch (err: unknown) {
  //   return next(err);
  // }
  // return res.status(500).send({ valid: false, message: "Incomplete route" });
  console.log('trackOrder')
  const orders = await B2COrderModel.find({ orderStage: { $gt: 1 } });

  orders.forEach(async (order) => {
    const smartshipToken = await getSmartShipToken();
    if (!smartshipToken) return Logger.warn("Smarthship ENVs not found");

    const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };
    try {
      const apiUrl = `${config.SMART_SHIP_API_BASEURL}${APIs.TRACK_SHIPMENT}=${order._id + "_" + order.order_reference_id}`;
      const response: TrackResponse = await axios.get(apiUrl, shipmentAPIConfig);
      if (response.message === "success") {
        const keys: string[] = Object.keys(response.data.scans);
        const requiredResponse: RequiredTrackResponse = response.data.scans[keys[0]][0];
        console.log({
          valid: true,
          response: {
            order_reference_id: requiredResponse?.order_reference_id?.split("_")[1],
            carrier_name: requiredResponse?.carrier_name,
            order_date: requiredResponse?.order_date,
            action: requiredResponse?.action,
            status_description: requiredResponse?.status_description,
          },
        });
      } else {
        // return res.status(500).send({ valid: false, message: "Something went wrong", response: response });
      }
    } catch (err) {
      // Handle the error here
    }
  });
}
export default function runCron() {
  const expression4every2Minutes = "*/2 * * * *";
  if (cron.validate(expression4every2Minutes)) {
    // cron.schedule(expression4every2Minutes, trackOrder);

    const expression4every5Minute = "5 * * * *";
    const expression4every59Minute = "59 * * * *";
    const expression4every9_59Hr = "59 9 * * * ";

    cron.schedule(expression4every59Minute, CONNECT_SMARTSHIP);
    cron.schedule(expression4every5Minute, CANCEL_REQUESTED_ORDER);
    cron.schedule(expression4every9_59Hr, CONNECT_SMARTR);

    Logger.log("cron scheduled");
  } else {
    Logger.log("Invalid cron expression");
  }

  // if (
  //   cron.validate(expression4every5Minute) &&
  //   cron.validate(expression4every59Minute) &&
  //   cron.validate(expression4every9_59Hr)
  // ) {
  //   cron.schedule(expression4every59Minute, CONNECT_SMARTSHIP);
  //   cron.schedule(expression4every5Minute, CANCEL_REQUESTED_ORDER);
  //   cron.schedule(expression4every9_59Hr, CONNECT_SMARTR);
  //   Logger.log("cron scheduled");
  // }
  // trackOrder()
}

//  [0, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 18, 19, 27, 28, 30]