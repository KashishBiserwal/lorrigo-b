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
import { isValidObjectId } from "mongoose";
import CustomPricingModel from "../models/custom_pricing.model";

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
    console.log(err);
    return next(err);
  }
  return res.status(200).send({
    valid: true,
    vendor: savedVendor,
  });
};

export const updateVendor4Seller = async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;
  if (!isValidPayload(body, ["vendorId", "sellerId"])) {
    return res.status(200).send({ valid: false, message: "Invalid payload." });
  }
  const { vendorId, sellerId } = body;
  if (!isValidObjectId(vendorId) || !isValidObjectId(sellerId)) {
    return res.status(200).send({ valid: false, message: "Invalid vendorId or sellerId." });
  }
  try {
    const vendor = await VendorModel.findById(vendorId);
    if (!vendor) return res.status(200).send({ valid: false, message: "Vendor not found" });
    delete body?.vendorId;
    delete body?.sellerId;
    const previouslySavedPricing = await CustomPricingModel.findOne({ sellerId, vendorId }).lean();
    let savedPricing;
    if (previouslySavedPricing) {
      //update it
      savedPricing = await CustomPricingModel.findByIdAndUpdate(previouslySavedPricing._id, { ...body }, { new: true });
      return res.status(200).send({ valid: true, message: "vendor priced updated for user", savedPricing });
    } else {
      // create it
      const toAdd = {
        vendorId: vendorId,
        sellerId: sellerId,
        withinCity: vendor.withinCity,
        withinZone: vendor.withinZone,
        withinMetro: vendor.withinMetro,
        withinRoi: vendor.withinRoi,
        northEast: vendor.northEast,
        ...body,
      };
      savedPricing = new CustomPricingModel(toAdd);
      savedPricing = await savedPricing.save();
      return res.status(200).send({ valid: true, message: "vendor priced updated for user", savedPricing });
    }
    return res.status(200).send({ valid: false, message: "Incomplee " });
  } catch (err) {
    return next(err);
  }
  return res.status(200).send({ valid: false, message: "Not implemented yet" });
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
// TODO: implementation of COD IS REMAINING
export const ratecalculatorController = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const body = req.body;
  const seller = req.seller;
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
      "paymentType",
      // "isFragileGoods",
    ])
  ) {
    return res.status(200).send({
      valid: false,
      message: "inalid payload",
    });
  }
  try {
    const data2send = await rateCalculation(
      body.pickupPincode,
      body.deliveryPincode,
      body.weight,
      body.weightUnit,
      body.boxLength,
      body.boxWidth,
      body.boxHeight,
      body.sizeUnit,
      body.paymentType,
      seller._id,
      body?.collectableAmount
    );
    return res.status(200).send({ valid: true, rates: data2send });
  } catch (err) {
    return next(err);
  }
};

const rateCalculation = async (
  pickupPincode: any,
  deliveryPincode: any,
  weight: any,
  weightUnit: any,
  boxLength: any,
  boxWidth: any,
  boxHeight: any,
  sizeUnit: any,
  paymentType: any,
  seller_id: any,
  collectableAmount?: any
) => {
  //  let { pickupPincode, deliveryPincode, weight, weightUnit, boxLength, boxWidth, boxHeight, sizeUnit, paymentType } =
  //   req.body;
  const numPaymentType = Number(paymentType);
  if (!(numPaymentType === 0 || numPaymentType === 1)) throw new Error("Invalid paymentType");
  // return res.status(200).send({ valid: false, message: "Invalid paymentType" });
  if (paymentType === 1) {
    if (!collectableAmount) {
      throw new Error("collectable amount is required.");
    }
    // if (!isValidPayload(body, ["collectableAmount"])) {
    //   throw new Error();
    //   // return res.status(200).send({ valid: false, message: "collectableAmount is required." });
    // }
  }
  if (weightUnit === "g") {
    weight = (1 / 1000) * weight;
  }
  let volumetricWeight = null;
  if (sizeUnit === "cm") {
    const volume = boxLength * boxWidth * boxHeight;
    volumetricWeight = Math.round(volume / 5000);
  } else if (sizeUnit === "m") {
    volumetricWeight = Math.round((boxLength * boxWidth * boxHeight) / 5);
  } else {
    throw new Error("unhandled size unit");
  }
  // } else return res.status(200).send({ valid: false, message: "unhandled size unit" });
  let orderWeight = volumetricWeight > Number(weight) ? volumetricWeight : Number(weight);

  const pickupDetails = await getPincodeDetails(Number(pickupPincode));
  const deliveryDetails = await getPincodeDetails(Number(deliveryPincode));

  if (!pickupDetails || !deliveryDetails) throw new Error("invalid pickup or delivery pincode");
  // return res.status(200).send({ valid: false, message: "invalid pickup or delivery pincode" });

  const vendors = await VendorModel.find({});
  const data2send: {
    name: string;
    minWeight: number;
    charge: number;
    type: string;
    expectedPickup: string;
  }[] = [];
  for (let i = 0; i < vendors.length; i++) {
    const cv = vendors[i];
    let increment_price = null;
    const userSpecificUpdatedVendorDetails = await CustomPricingModel.find({
      vendorId: cv._id,
      sellerId: seller_id,
    });
    if (userSpecificUpdatedVendorDetails.length === 1) {
      cv.withinCity = userSpecificUpdatedVendorDetails[0].withinCity;
      cv.withinZone = userSpecificUpdatedVendorDetails[0].withinZone;
      cv.withinMetro = userSpecificUpdatedVendorDetails[0].withinMetro;
      cv.northEast = userSpecificUpdatedVendorDetails[0].northEast;
      cv.withinRoi = userSpecificUpdatedVendorDetails[0].withinRoi;
    }
    if (pickupDetails.District === deliveryDetails.District) {
      increment_price = cv.withinCity;
    } else if (pickupDetails.StateName === deliveryDetails.StateName) {
      // same state
      increment_price = cv.withinZone;
    } else if (
      MetroCitys.find((city) => city === pickupDetails?.District) &&
      MetroCitys.find((city) => city === deliveryDetails?.District)
    ) {
      // metro citys
      increment_price = cv.withinMetro;
    } else if (
      NorthEastStates.find((state) => state === pickupDetails?.StateName) &&
      NorthEastStates.find((state) => state === deliveryDetails?.StateName)
    ) {
      // north east
      increment_price = cv.northEast;
    } else {
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
    let totalCharge = 0;
    totalCharge += increment_price.basePrice;
    orderWeight = orderWeight - cv.weightSlab;
    const weightIncrementRatio = orderWeight / cv.incrementWeight;
    totalCharge += increment_price.incrementPrice * weightIncrementRatio;

    data2send.push({
      name: cv.name,
      minWeight,
      charge: totalCharge,
      type: cv.type,
      expectedPickup,
    });
  }
  return data2send;
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
  // const token = await redis.get("token:smartship");
  // if (token) {
  //   return token;
  // } else {
  const env = await EnvModel.findOne({ name: "SMARTSHIP" }).lean();
  if (!env) return false;
  //@ts-ignore
  const smartshipToken = env?.token_type + " " + env?.access_token;
  return smartshipToken;
  // }
}
export async function getSMARTRToken(): Promise<string | false> {
  // const tok = await redis.get("token:smartr");
  // if (tok) {
  //   return tok;
  // } else {
  const env = await EnvModel.findOne({ name: "SMARTR" }).lean();
  if (!env) return false;
  //@ts-ignore
  const token = env?.data?.token_type + " " + env?.data?.access_token;
  return token;
  // }
}

export function getStatusCode(description: string): number {
  const statusMap: { [key: string]: number | number[] } = {
    Open: 0,
    Confirmed: 2,
    "Shipping Label Generated": 3,
    Manifested: 4,
    Shipped: 10,
    Delivered: 11,
    "Delivery Attempted-Out Of Delivery Area": 12,
    "Delivery Attempted-Address Issue / Wrong Address": 13,
    "Delivery Attempted-COD Not ready": 14,
    "Delivery Attempted-Customer Not Available/Contactable": 15,
    "Delivery Attempted-Customer Refused To Accept Delivery": 16,
    "Delivery Attempted-Requested for Future Delivery": 17,
    "Return To Origin": 18,
    "RTO Delivered To Shipper": 19,
    "Delivery Attempted - Requested For Open Delivery": 22,
    "Delivery Attempted - Others": 23,
    "Courier Assigned": 24,
    "Cancellation Requested By Client": 26,
    "In Transit": 27,
    "RTO In Transit": 28,
    "Out For Delivery": 30,
    "Handed Over to Courier": 36,
    "Delivery Confirmed by Customer": 48,
    "In Transit Delay - ODA Location/ Area Not Accessible": 59,
    "RTO to be Refunded": 118,
    "Cancelled By Client": 185,
    "Forward Shipment Lost": 189,
    "RTO-Rejected by Merchant": 198,
    "RTO-Delivered to FC": [199, 201],
    "Shipped - In Transit - Misrouted": 207,
    "Shipped - In Transit - Destination Reached": 209,
    "Delivery Not Attempted": 210,
    "RTO - In Transit - Damaged": 212,
    "Delivery Attempted-Refused by Customer with OTP": 214,
  };

  if (statusMap.hasOwnProperty(description)) {
    const statusCode = statusMap[description];
    return Array.isArray(statusCode) ? statusCode[0] : statusCode;
  }

  return -1;
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
