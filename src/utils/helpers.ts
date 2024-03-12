import axios from "axios";
import config from "./config";
import EnvModel from "../models/env.model";
import type { NextFunction, Request, Response } from "express";
import VendorModel from "../models/vendor.model";
import PincodeModel from "../models/pincode.model";
import SellerModel from "../models/seller.model";
import { ExtendedRequest } from "./middleware";
import APIs from "./constants/third_party_apis";
import Logger from "./logger";
import https from "node:https";
import redis from "../models/redis";

export const validateEmail = (email: string): boolean => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)*[a-zA-Z]{2,}))$/.test(
    email
  );
};

export const validatePhone = (phone: number): boolean => {
  return phone > 999999999;
};

export const validateSmartShipServicablity = async (
  orderType: 0 | 1,
  hub_id: number,
  destinationPinode: number,
  orderWeight: number,
  prefferredCarrier: number[]
): Promise<boolean> => {
  const requestBody: any = {
    order_info: {
      hub_ids: [hub_id],
      destination_pincode: destinationPinode,
      orderWeight: orderWeight,
      preferred_carriers: [...prefferredCarrier],
    },
    request_info: { extra_info: true, cost_info: false },
  };
  if (orderType) {
    // 1/ true for forward 0 for reverse
    requestBody.order_info.destination_pincode = destinationPinode;
  } else {
    requestBody.source_pincode = destinationPinode;
  }
  const smartshipToken = await getSmartShipToken();

  const smartshipAPIconfig = { headers: { Authorization: smartshipToken } };
  try {
    const response = await axios.post(
      config.SMART_SHIP_API_BASEURL + APIs.HUB_SERVICEABILITY,
      requestBody,
      smartshipAPIconfig
    );
    const responseData = response.data;
    Logger.log(responseData);
    return responseData.data.serviceability_status;
  } catch (err) {
    return false;
  }

  return false;
};

export const addVendors = async (req: Request, res: Response, next: NextFunction) => {
  const vendor = new VendorModel(req.body);
  let savedVendor;
  try {
    savedVendor = await vendor.save();
  } catch (err) {
    return next(err);
  }
  return res.status(200).send({
    valid: true,
    vendor: savedVendor,
  });
};

export const getSellers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellers = await SellerModel.find({}, { password: 0, __v: 0 });
    res.status(200).send({
      valid: true,
      sellers: sellers,
    });
  } catch (err) {
    return next(err);
  }
};

export const isValidPayload = (body: any, field: string[]): boolean => {
  if (Object.keys(body).length === 0) return false;
  for (let i = 0; i < field.length; i++) {
    if (!Object.keys(body).includes(field[i])) {
      Logger.log(field[i] + " is not a valid");
      return false;
    }
  }
  return true;
};

export const ratecalculatorController = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const body = req.body;

  if (
    !isValidPayload(body, [
      "pickupPincode",
      "deliveryPincode",
      "weight",
      "weightUnit",
      "boxLength",
      "boxWidth",
      "boxHeight",
      "sizeUnit",
      "isFragileGoods",
    ])
  ) {
    return res.status(200).send({
      valid: false,
      message: "inalid payload",
    });
  }
  const {
    pickupPincode,
    deliveryPincode,
    weight,
    weightUnit,
    boxLength,
    boxWidth,
    boxHeight,
    sizeUnit,
    isFragileGoods,
  } = req.body;

  const seller = req.seller;
  Logger.log(seller);
  const margin = seller.margin;

  let volumetricWeight = null;
  if (sizeUnit === "cm") {
    volumetricWeight = (boxLength * boxWidth * boxHeight) / 5000;
  } else if (sizeUnit === "m") {
    volumetricWeight = (boxLength * boxWidth * boxHeight) / 5;
  } else return res.status(200).send({ valid: false, message: "unhandled size unit" });
  const orderWeight = volumetricWeight > Number(weight) ? volumetricWeight : Number(weight);

  const pickupDetails = await getPincodeDetails(Number(pickupPincode));
  const deliveryDetails = await getPincodeDetails(Number(deliveryPincode));
  if (!pickupDetails || !deliveryDetails) {
    return res.status(200).send({ valid: false, message: "invalid pickup or delivery pincode" });
  }

  const vendors = await VendorModel.find({});
  const data2send = vendors.reduce((acc: any[], cv) => {
    let increment_price = null;
    if (pickupDetails.District === deliveryDetails.District) {
      // same city
      Logger.log("same city");
      increment_price = cv.withinCity;
    } else if (pickupDetails.StateName === deliveryDetails.StateName) {
      Logger.log("same state");
      // same state
      increment_price = cv.withinZone;
    } else if (
      MetroCitys.find((city) => city === pickupDetails?.District) &&
      MetroCitys.find((city) => city === deliveryDetails?.District)
    ) {
      Logger.log("metro ");
      // metro citys
      increment_price = cv.withinMetro;
    } else if (
      NorthEastStates.find((state) => state === pickupDetails?.StateName) &&
      NorthEastStates.find((state) => state === deliveryDetails?.StateName)
    ) {
      Logger.log("northeast");
      // north east
      increment_price = cv.northEast;
    } else {
      Logger.log("roi");
      // rest of india
      increment_price = cv.withinRoi;
    }
    if (!increment_price) {
      return [{ message: "invalid incrementPrice" }];
    }

    const parterPickupTime = cv.pickupTime;
    const partnerPickupHour = Number(parterPickupTime.split(":")[0]);
    const partnerPickupMinute = Number(parterPickupTime.split(":")[1]);
    const partnerPickupSecond = Number(parterPickupTime.split(":")[2]);
    const pickupTime = new Date(new Date().setHours(partnerPickupHour, partnerPickupMinute, partnerPickupSecond, 0));

    const currentTime = new Date();
    let expectedPickup: string;
    if (pickupTime < currentTime) {
      expectedPickup = "Tomorrow";
    } else {
      expectedPickup = "Today";
    }

    const minWeight = cv.weightSlab;
    // TODO apply cod
    //@ts-ignore
    const weightIncrementRatio = (orderWeight - minWeight) / cv.incrementWeight;
    let totalCharge = increment_price.basePrice + increment_price?.incrementPrice * weightIncrementRatio;
    totalCharge = totalCharge + (margin / 100) * totalCharge;
    const gst = 0.18 * totalCharge;
    totalCharge = totalCharge += gst;

    //@ts-ignore
    return acc.concat({
      name: cv.name,
      minWeight,
      charge: totalCharge,
      type: cv.type,
      expectedPickup,
    });
  }, []);

  return res.status(200).send({ valid: true, rates: data2send });
};
// condition timing should be in the format: "hour:minute:second"
export const getNextDateWithDesiredTiming = (timing: string): Date => {
  const currentDate = new Date();
  const hour = Number(timing.split(":")[0]);
  const minute = Number(timing.split(":")[1]);
  const second = Number(timing.split(":")[2]);
  currentDate.setHours(hour, minute, second, 0);
  currentDate.setDate(currentDate.getDate() + 1);
  return currentDate;
};

export const getPincodeDetails = async (Pincode: number) => {
  const picodeDetails = await PincodeModel.findOne({ Pincode }).lean();
  return picodeDetails;
};

export const validateStringDate = (date: string): boolean => {
  const splittedDate = date.split("-");
  const splittedDateCount = splittedDate.length;

  if (splittedDateCount !== 3) {
    return false;
  }
  if (splittedDate[0].length !== 2 || splittedDate[1].length !== 2 || splittedDate[2].length !== 4) {
    return false;
  }
  return true;
};

export const MetroCitys = [
  "New Delhi",
  "MUMBAI",
  "Pune",
  "GURGAON",
  "KOLKATA",
  "Kolkata",
  "HYDERABAD",
  "Hyderabad",
  "CHENNAI",
  "Chennai",
  "Bangalore",
  "BENGALURU RURAL",
  "BENGALURU",
  "Ahmedabad City",
  "Ahmedabad",
];
export const NorthEastStates = ["Sikkim", "Mizoram", "Manipur", "Assam", "Megalaya", "Nagaland", "Tripura"];

export async function getSmartShipToken(): Promise<string | false> {
  const token = await redis.get("token:smartship");
  if (token) {
    return token;
  } else {
    const env = await EnvModel.findOne({ name: "SMARTSHIP" }).lean();
    if (!env) return false;
    //@ts-ignore
    const smartshipToken = env?.token_type + " " + env?.access_token;
    return smartshipToken;
  }
}
export async function getSMARTRToken(): Promise<string | false> {
  const tok = await redis.get("token:smartr");
  if (tok) {
    return tok;
  } else {
    const env = await EnvModel.findOne({ name: "SMARTR" }).lean();
    if (!env) return false;
    //@ts-ignore
    const token = env?.data?.token_type + " " + env?.data?.access_token;
    return token;
  }
}

export async function isSmartr_surface_servicable(pincode: number): Promise<boolean> {
  /*
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://uat.smartr.in/api/v1/pincode?pincode=122008",
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    headers: {
      Cookie:
        "csrftoken=1qesTyXbnnTIfNWLe8h8oAizJxVM8xtvTmZZRtoQhEdhH7KcfbywxXL892Qda2l4; sessionid=6rf0mzqk7pqif84y4se21hu9u63balbl",
    },
  };

  axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });
  */
  // /*
  let response;
  const token = await getSMARTRToken();
  if (!token) return false;
  try {
    console.log(APIs.PIN_CODE + "?pincode=122008");
    console.log(token);
    response = await axios.get(APIs.PIN_CODE + `?pincode=${pincode}`, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        Authorization: token,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.log(err.message);
      return false;
    } else {
      console.log(err);
      return false;
    }
  }
  const data: PINCODE_RESPONSE = response.data;
  Logger.log("pincode response");
  Logger.log(data);
  Logger.log("pincode response");
  if (!data?.error && data.status === "failed") return false;
  if (data?.data) return true;
  return false;
}

type PINCODE_RESPONSE = {
  status: "failed" | "Success";
  error?: string;
  data: [
    {
      pincode: number;
      area_name: string;
      city_name: string;
      service_center: string;
      state_code: string;
      state_name: string;
      inbound: boolean;
      outbound: boolean;
      embargo: boolean;
      is_surface: boolean;
      region: string;
      country_code: string;
      zone: string;
      route_code: string;
      services: string;
      is_active: boolean;
    }
  ];
};
