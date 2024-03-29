import { type Request, type Response, type NextFunction, response } from "express";
import { getSMARTRToken, getSmartShipToken, getStatusCode, isValidPayload } from "../utils/helpers";
import { B2BOrderModel, B2COrderModel } from "../models/order.model";
import { isValidObjectId } from "mongoose";
import axios from "axios";
import config from "../utils/config";
import APIs from "../utils/constants/third_party_apis";
import EnvModel from "../models/env.model";
import type { ExtendedRequest } from "../utils/middleware";
import ProductModel from "../models/product.model";
import ShipmentResponseModel from "../models/shipment-response.model";
import VendorModel from "../models/vendor.model";
import HubModel from "../models/hub.model";
import { HttpStatusCode } from "axios";
import Logger from "../utils/logger";
import https from "node:https";
import { OrderPayload } from "../types/b2b";
import {
  calculateAverageShippingCost,
  calculateCODDetails,
  calculateNDRDetails,
  calculateRevenue,
  calculateShipmentDetails,
} from "../utils";
import { RequiredTrackResponse, TrackResponse } from "../types/b2c";

/*
export async function createShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const body = req.body;

  if (req.seller?.gstno) return res.status(200).send({ valid: false, message: "Invalid seller gst number " });

  if (!(isValidPayload(body, ["orderId", "orderType"]) && isValidObjectId(body.orderId)))
    return res.status(200).send({ valid: false, message: "Invalid payload" });

  if (!isValidObjectId(body.orderId)) return res.status(200).send({ valid: false, message: "Invalid payload" });

  let { orderId, orderType, carrierId } = req.body;
  if (!carrierId) {
    return res.status(200).send({ valid: false, message: "carrier id required" });
  }
  carrierId = Number(carrierId);
  const vendorWithCarrierId = await VendorModel.findOne({ smartship_carrier_id: carrierId }).lean();
  if (!vendorWithCarrierId) {
    return res.status(200).send({ valid: false, message: "Invalid carrier" });
  }
  let order;
  if (Number(orderType) === 0) {
    try {
      order = await B2COrderModel.findById(orderId).populate("pickupAddress");
    } catch (err) {
      return next(err);
    }
  } else if (Number(orderType) === 1) {
    try {
      order = await B2COrderModel.findById(orderId);
    } catch (err) {
      return next(err);
    }
  } else {
    return res.status(200).send({ valid: false, message: "invalid order type" });
  }
  if (!order) return res.status(200).send({ valid: false, message: "Order not found" });
  console.log(order?.productId);
  const productDetails = await ProductModel.findById(order?.productId);

  console.log(productDetails);

  if (productDetails === null) return res.status(200).send({ valid: false, message: "Product details not found" });

  const env = await EnvModel.findOne({}).lean();
  if (!env) return res.status(500).send({ valid: false, message: "Smartship ENVs not found" });
  const smartshipToken = env.token_type + " " + env.access_token;

  let {
    order_refernce_id,
    paymentMode,
    shipmentValue,
    productTaxRate,
    weightUnit,
    boxWeight,
    numberOfBox,
    sizeUnit,
    boxLength,
    boxHeight,
    boxWidth,
    invoiceDate,
    invoiceNumber,
    customerDetails,
    amountToCollect,
  } = order;
  const { pickupAddress } = order;

  const orderTotalValue = shipmentValue + shipmentValue * (productTaxRate / 100);
  //@ts-ignore
  const hubId = pickupAddress?.hub_id;
  console.log("shipment");
  console.log(shipmentValue);
  console.log("shipment");

  boxWeight = Number(boxWeight);
  boxLength = Number(boxLength);
  boxHeight = Number(boxHeight);
  boxWidth = Number(boxWeight);

  let orderWeight = boxWeight;
  if (weightUnit === "kg") boxWeight = boxWeight * 1000;
  orderWeight *= Number(numberOfBox);
  if (sizeUnit === "m") {
    boxWidth = boxWeight * 100;
    boxHeight = boxWeight * 100;
    boxLength = boxLength * 100;
  }

  const productTaxableValue = (order.productTaxRate / 100) * order.shipmentValue;

  const shipmentAPIBody = {
    request_info: {
      run_type: "validate",
      shipment_type: 1, // 1 => forward, 2 => return order
    },
    orders: [
      {
        client_order_reference_id: order_refernce_id,
        order_collectable_amount: amountToCollect, // need to take  from user in future
        total_order_value: orderTotalValue,
        payment_type: paymentMode ? "cod" : "prepaid",
        // package_order_weight: orderWeight,
        // package_order_length: boxLength,
        // package_order_height: boxHeight,
        package_order_weight: 1.5,
        package_order_length: 10,
        package_order_width: 10,
        package_order_height: 20,
        shipper_hub_id: hubId,
        shipper_gst_no: req.seller.gstno,
        order_invoice_date: invoiceDate, // not mandatory
        order_invoice_number: invoiceNumber, // not mandatory
        order_meta: {
          // not mandatory
          preferred_carriers: [carrierId],
        },
        product_details: [
          {
            client_product_reference_id: "123", // not mandantory
            // @ts-ignore
            product_name: productDetails.name,
            // @ts-ignore
            product_category: productDetails.category,
            product_hsn_code: productDetails?.hsn_code, // appear to be mandantory
            product_quantity: productDetails?.quantity,
            product_invoice_value: orderTotalValue, //productDetails?.invoice_value, // invoice value
            product_taxable_value: shipmentValue,
            product_gst_tax_rate: 18,
            product_sgst_amount: 0,
            product_sgst_tax_rate: 0,
            product_cgst_amount: 0,
            product_cgst_tax_rate: 0,
          },
        ],
        consignee_details: {
          consignee_name: customerDetails.get("name"),
          consignee_phone: customerDetails?.get("phone"),
          consignee_email: customerDetails.get("email"),
          consignee_complete_address: customerDetails.get("address"),
          consignee_pincode: customerDetails.get("pincode"),
        },
      },
    ],
  };
  // return res.sendStatus(500);
  const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };
  // /*
  console.log("shipment api body");
  console.log(JSON.stringify(shipmentAPIBody));
  console.log("shipment api body");
  try {
    const response = await axios.post(
      config.SMART_SHIP_API_BASEURL + APIs.CREATE_SHIPMENT,
      shipmentAPIBody,
      shipmentAPIConfig
    );

    const responseData = response.data;
    console.log(JSON.stringify(responseData));
    if (!responseData?.data?.total_success_orders) {
      return res.status(200).send({ valid: false, message: "order failed to create" });
    }

    const shipemntResponseToSave = new ShipmentResponseModel({ order: orderId, responseData });
    try {
      await shipemntResponseToSave.save();
      let updatedOrder;
      try {
        updatedOrder = await B2COrderModel.findByIdAndUpdate(order._id, { orderStage: 1 }, { new: true });
      } catch (err) {
        return next(err);
      }

      return res.status(200).send({
        valid: true,
        message: "Shipment created successfully",
        resposne: response.data,
        savedDocument: shipemntResponseToSave,
        updatedOrder,
      });
    } catch (err) {
      console.log("failed to save shipment response");
      console.log(err);
      return next(err);
    }
  } catch (err) {
    return next(err);
  }
  return res.status(500).send({ valid: false, message: "incomplete route", order: order });
}
*/

// TODO: REMOVE THIS CODE: orderType = 0 ? "b2c" : "b2b"
export async function createShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const body = req.body;

  if (!isValidPayload(body, ["orderId", "orderType", "carrierId"])) {
    return res.status(200).send({ valid: false, message: "Invalid payload" });
  }
  if (!isValidObjectId(body?.orderId)) return res.status(200).send({ valid: false, message: "Invalid orderId" });
  if (body.orderType !== 0) return res.status(200).send({ valid: false, message: "Invalid orderType" });

  if (req.seller?.gstno) return res.status(200).send({ valid: false, message: "KYC required. (GST number) " });

  const vendorDetails = await VendorModel.findOne({ smartship_carrier_id: Number(body.carrierId) }).lean();
  if (!vendorDetails) return res.status(200).send({ valid: false, message: "Invalid carrier" });

  let order;
  try {
    order = await B2COrderModel.findOne({ _id: body.orderId, sellerId: req.seller._id });
    if (!order) return res.status(200).send({ valid: false, message: "order not found" });
  } catch (err) {
    return next(err);
  }
  let hubDetails;
  try {
    hubDetails = await HubModel.findById(order.pickupAddress);
    if (!hubDetails) return res.status(200).send({ valid: false, message: "Hub details not found" });
  } catch (err) {
    return next(err);
  }
  let productDetails;
  try {
    productDetails = await ProductModel.findById(order.productId);
    if (!productDetails) {
      return res.status(200).send({ valid: false, message: "Product details not found" });
    }
  } catch (err) {

    return next(err);
  }
  const productValueWithTax =
    Number(productDetails.taxable_value) +
    (Number(productDetails.tax_rate) / 100) * Number(productDetails.taxable_value);

  const totalOrderValue = productValueWithTax * Number(productDetails.quantity);

  const shipmentAPIBody = {
    request_info: {
      run_type: "create",
      shipment_type: 1, // 1 => forward, 2 => return order
    },
    orders: [
      {
        client_order_reference_id: order?._id + "_" + order.order_reference_id,
        order_collectable_amount: order.payment_mode === 1 ? order.amount2Collect : 0, // need to take  from user in future
        total_order_value: totalOrderValue,
        payment_type: order.payment_mode ? "cod" : "prepaid",
        package_order_weight: order.orderBoxWidth,
        package_order_length: order.orderBoxLength,
        package_order_width: order.orderBoxWidth,
        package_order_height: order.orderBoxHeight,
        shipper_hub_id: hubDetails.hub_id,
        shipper_gst_no: req.seller.gstno,
        order_invoice_date: order?.order_invoice_date, // not mandatory
        order_invoice_number: order?.order_invoice_number, // not mandatory
        order_meta: {
          // not mandatory
          preferred_carriers: [body.carrierId],
        },
        product_details: [
          {
            client_product_reference_id: "something", // not mandantory
            product_name: productDetails?.name,
            product_category: productDetails?.category,
            product_hsn_code: productDetails?.hsn_code, // appear to be mandantory
            product_quantity: productDetails?.quantity,
            product_invoice_value: 11234, //productDetails?.invoice_value, // invoice value
            product_taxable_value: productDetails.taxable_value,
            product_gst_tax_rate: productDetails.tax_rate || 18,
          },
        ],
        consignee_details: {
          consignee_name: order.customerDetails.get("name"),
          consignee_phone: order.customerDetails?.get("phone"),
          consignee_email: order.customerDetails.get("email"),
          consignee_complete_address: order.customerDetails.get("address"),
          consignee_pincode: order.customerDetails.get("pincode"),
        },
      },
    ],
  };
  let smartshipToken;
  try {
    smartshipToken = await getSmartShipToken();
    if (!smartshipToken) return res.status(200).send({ valid: false, message: "Invalid token" });
  } catch (err) {
    return next(err);
  }
  let externalAPIResponse: any;
  try {
    const requestConfig = { headers: { Authorization: smartshipToken } };
    const response = await axios.post(
      config.SMART_SHIP_API_BASEURL + APIs.CREATE_SHIPMENT,
      shipmentAPIBody,
      requestConfig
    );
    externalAPIResponse = response.data;
  } catch (err: unknown) {
    return next(err);
  }
  console.log("externalAPIResponse", externalAPIResponse);
  Logger.log(externalAPIResponse);

  if (externalAPIResponse?.status === "403") {
    return res.status(500).send({ valid: true, message: "Smartship ENVs is expired." });
  }
  if (!externalAPIResponse?.data?.total_success_orders) {
    return res
      .status(200)
      .send({ valid: false, message: "order failed to create", order, response: externalAPIResponse });
  } else {
    const shipmentResponseToSave = new ShipmentResponseModel({ order: order._id, response: externalAPIResponse });
    try {
      const savedShipmentResponse = await shipmentResponseToSave.save();
      const awbNumber = externalAPIResponse?.data?.success_order_details?.orders[0]?.awb_number
      order.orderStage = 1;
      order.awb = awbNumber;
      const updatedOrder = await order.save();
      return res.status(200).send({ valid: true, order: updatedOrder, shipment: savedShipmentResponse });
    } catch (err) {
      return next(err);
    }
  }
  return res.status(500).send({ valid: false, message: "something went wrong", order, externalAPIResponse });
}

export async function cancelShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const body = req.body;
  const { orderId } = body;

  if (!(orderId && isValidObjectId(orderId))) {
    return res.status(200).send({ valid: false, message: "invalid payload" });
  }

  let order;
  try {
    order = await B2COrderModel.findOne({ _id: orderId, orderStage: 1, sellerId: req.seller._id }).lean();
  } catch (err) {
    return next(err);
  }

  if (!order)
    return res.status(200).send({ valid: false, message: `No active shipment found with orderId=${orderId}` });

  // const env = await EnvModel.findOne({}).lean();
  // if (!env) return res.status(500).send({ valid: false, message: "Smartship ENVs not found" });
  // const smartshipToken = env.token_type + " " + env.access_token;
  const smartshipToken = await getSmartShipToken();
  if (!smartshipToken) return res.status(200).send({ valid: false, message: "SMARTSHIP ENVs not found" });

  const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };

  const requestBody = {
    request_info: {},
    orders: {
      client_order_reference_ids: [order._id + "_" + order.order_reference_id],
    },
  };

  const externalAPIResponse = await axios.post(
    config.SMART_SHIP_API_BASEURL + APIs.CANCEL_SHIPMENT,
    requestBody,
    shipmentAPIConfig
  );

  if (externalAPIResponse.data.status === "403") {
    return res.status(500).send({ valid: false, message: "Smartships Envs expired" });
  }

  const order_cancellation_details = externalAPIResponse.data?.data?.order_cancellation_details;

  if (order_cancellation_details?.failure) {
    // handling failure
    const isAlreadyCancelled = new RegExp("Already Cancelled.").test(
      externalAPIResponse?.data?.data?.order_cancellation_details?.failure[order?.order_reference_id]?.message
    );
    const isAlreadyRequested = new RegExp("Cancellation already requested.").test(
      externalAPIResponse?.data?.data?.order_cancellation_details?.failure[order?.order_reference_id]?.message
    );
    if (isAlreadyCancelled) {
      try {
        const updatedOrder = await B2COrderModel.findByIdAndUpdate(order?._id, { orderStage: 3 }, { new: true });
        return res.status(200).send({ valid: false, message: "Already Cancelled.", order: updatedOrder });
      } catch (err: unknown) {
        return next(err);
      }
    } else if (isAlreadyRequested) {
      try {
        const updatedOrder = await B2COrderModel.findByIdAndUpdate(order?._id, { orderStage: 2 }, { new: true });
        return res
          .status(200)
          .send({ valid: false, message: "Already requested for cancellation.", order: updatedOrder });
      } catch (err: unknown) {
        return next(err);
      }
    } else {
      return res.status(200).send({ valid: false, message: "Incomplete route section", order_cancellation_details });
    }
  } else {
    // handling success.
    try {
      const updatedOrder = await B2COrderModel.findByIdAndUpdate(order?._id, { orderStage: 2 }, { new: true });
      return res.status(200).send({ valid: true, message: "Order cancelation request Generated", order: updatedOrder });
    } catch (err) {
      return next(err);
    }
  }
  return res
    .status(200)
    .send({ valid: false, message: "unhandled section of route", response: externalAPIResponse.data });
}

export async function orderManifest(req: ExtendedRequest, res: Response, next: NextFunction) {
  const body = req.body;
  const { orderId } = body;

  if (!(orderId && isValidObjectId(orderId))) {
    return res.status(200).send({ valid: false, message: "invalid payload" });
  }

  let order;
  try {
    order = await B2COrderModel.findOne({ _id: orderId, sellerId: req.seller._id }).lean();
  } catch (err) {
    return next(err);
  }

  if (!order) return res.status(200).send({ valid: false, message: "order not found" });

  const smartshipToken = await getSmartShipToken();
  if (!smartshipToken) return res.status(200).send({ valid: false, message: "Smarthship ENVs not found" });

  const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };

  const requestBody = {
    // client_order_reference_ids: [order._id + "_" + order.order_reference_id],
    // client_order_reference_ids: [order._id + "_" + order.order_reference_id],
    preferred_pickup_date: "2024-03-22",
    shipment_type: 1,
  };

  const externalAPIResponse = await axios.post(
    config.SMART_SHIP_API_BASEURL + APIs.ORDER_MANIFEST,
    requestBody,
    shipmentAPIConfig
  );
  console.log(externalAPIResponse.data, "externalAPIResponse")
  if (externalAPIResponse.data.status === "403") {
    return res.status(500).send({ valid: false, message: "Smartships Envs expired" });
  }

  const order_manifest_details = externalAPIResponse.data?.data;

  if (order_manifest_details?.failure) {
    return res.status(200).send({ valid: false, message: "Incomplete route", order_manifest_details });
  } else {
    return res.status(200).send({ valid: true, message: "Order manifest request Generated", order_manifest_details });
  }
}

export async function trackShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const orderReferenceId = req.query?.id;
  if (!orderReferenceId) return res.status(200).send({ valid: false, message: "orderReferenceId required" });

  const orderWithOrderReferenceId = await B2COrderModel.findOne({ order_reference_id: orderReferenceId });
  if (!orderWithOrderReferenceId) {
    return res.status(200).send({ valid: false, message: "order doesn't exists" });
  }

  const smartshipToken = await getSmartShipToken();
  if (!smartshipToken) return res.status(200).send({ valid: false, message: "Smarthship ENVs not found" });

  const shipmentAPIConfig = { headers: { Authorization: smartshipToken } };
  
  try {
    const apiUrl = `${config.SMART_SHIP_API_BASEURL}${APIs.TRACK_SHIPMENT}=${orderWithOrderReferenceId._id + "_" + orderReferenceId
      }`;
    const response = await axios.get(apiUrl, shipmentAPIConfig);

    const responseJSON: TrackResponse = response.data;
    if (responseJSON.message === "success") {
      const keys: string[] = Object.keys(responseJSON.data.scans);
      const requiredResponse: RequiredTrackResponse = responseJSON.data.scans[keys[0]][0];
      // Update order status
      const statusCode = getStatusCode(requiredResponse?.status_description ?? '');
      orderWithOrderReferenceId.orderStage = statusCode;
      orderWithOrderReferenceId.orderStages.push({
        stage: statusCode,
        action: requiredResponse?.action ?? '',
        stageDateTime: new Date(),
      });

      await orderWithOrderReferenceId.save();

      return res.status(200).send({
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
      return res.status(500).send({ valid: false, message: "Something went wrong", response: responseJSON });
    }
  } catch (err: unknown) {
    return next(err);
  }
  return res.status(500).send({ valid: false, message: "Incomplete route" });
}

/**
 *
 * @param ExtendedRequest
 * @param Response
 * @param NextFunction
 * @author kapilrohilla, Alok Sharma
 * @body {orderId: string}
 * @returns
 */
export async function createB2BShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const body = req.body;
  const sellerId = req.seller._id;
  if (!isValidPayload(body, ["orderId"])) return res.status(200).send({ valid: false, message: "Invalid payload" });
  if (!isValidObjectId(body?.orderId)) return res.status(200).send({ valid: false, message: "invalid orderId" });

  const order: OrderPayload | null = await B2BOrderModel.findOne({ _id: body?.orderId, sellerId })
    .populate("customers")
    .populate("pickupAddress")
    .lean();
  if (!order) return res.status(200).send({ valid: false, message: "order not found" });
  console.log(order, 0);
  const smartr_token = await getSMARTRToken();
  if (!smartr_token) return res.status(500).send({ valid: false, message: "SMARTR token not found" });

  // TODO: adjust totalOrderWeight according to their unit.
  // @ts-ignore
  const totalOrderWeight = order?.packageDetails?.reduce((acc, cv) => acc + cv?.boxWeight, 0);
  console.log(totalOrderWeight, 0);
  // let data = [
  //   {
  //     packageDetails: {
  //       awbNumber: "",
  //       orderNumber: "0000000000000000",
  //       productType: "WKO", // WKO for surface bookings
  //       collectableValue: order?.amount2Collect,
  //       declaredValue: order?.totalOrderValue,
  //       itemDesc: order?.description,
  //       dimensions: "10~10~10~1~0.5~0/",
  //       pieces: (order?.packageDetails?.length ?? 0) + "",
  //       weight: totalOrderWeight + "",
  //       invoiceNumber: order.invoiceNumber + "",
  //     },
  //     deliveryDetails: {
  //       toName: order.customers?.[0]?.name ?? "",
  //       toAdd: order.customers?.[0]?.address ?? "",
  //       toCity: order.customers?.[0]?.city ?? "",
  //       toState: order.customers?.[0]?.state ?? "",
  //       toPin: order.customers?.[0]?.pincode ?? "",
  //       toMobile: order.customers?.[0]?.phone ?? "",
  //       toAddType: "Home",
  //       toLat: "26.00",
  //       toLng: "78.00",
  //       toEmail: order.customers?.[0]?.email ?? "",
  //     },
  //     pickupDetails: {
  //       fromName: order.pickupAddress?.name,
  //       fromAdd: order.pickupAddress?.address1,
  //       fromCity: order.pickupAddress?.city,
  //       fromState: order.pickupAddress?.state,
  //       fromPin: order.pickupAddress?.pincode,
  //       fromMobile: order.pickupAddress?.phone,
  //       fromAddType: "Hub",
  //       fromLat: "26.00",
  //       fromLng: "78.00",
  //       fromEmail: "ankurs@smartr.in",
  //     },
  //     returnDetails: {
  //       rtoName: order.pickupAddress?.name,
  //       rtoAdd: order.pickupAddress?.address1,
  //       rtoCity: order.pickupAddress?.city,
  //       rtoState: order.pickupAddress?.state,
  //       rtoPin: order.pickupAddress?.pincode,
  //       rtoMobile: order.pickupAddress?.phone,
  //       rtoAddType: "Hub",
  //       rtoLat: "26.00",
  //       rtoLng: "78.00",
  //       rtoEmail: "ankurs@smartr.in",
  //     },
  //     additionalInformation: {
  //       customerCode: "SMARTRFOC",
  //       essentialFlag: "",
  //       otpFlag: "",
  //       dgFlag: "",
  //       isSurface: "true",
  //       isReverse: "false",
  //       sellerGSTIN: "06GSTIN678YUIOIN",
  //       sellerERN: "",
  //     },
  //   },
  // ];

  let data = [
    {
      "packageDetails": {
        "awbNumber": "",
        "orderNumber": "597770",
        "productType": "WKO",
        "collectableValue": "0",
        "declaredValue": "1800.00",
        "itemDesc": "General",
        "dimensions": "21~18~10~1~9~0/",
        "pieces": 1,
        "weight": "9",
        "invoiceNumber": "97755"
      },
      "deliveryDetails": {
        "toName": "KESHAV KOTIAN",
        "toAdd": "D9, MRG SREEVALSAM, THIRUVAMBADY ROAD, ",
        "toCity": "SOUTH WEST DELHI",
        "toState": "Delhi",
        "toPin": "110037",
        "toMobile": "9769353573",
        "toAddType": "",
        "toLat": "",
        "toLng": "",
        "toEmail": ""
      },
      "pickupDetails": {
        "fromName": "KESHAV ITD",
        "fromAdd": "SOC NO 4,SHOP NO 3,LOVELY SOC,NEAR GANESH, TEMPLE,MAHADA,4 BUNGLOWS,ANDHEI W, ",
        "fromCity": "MUMBAI",
        "fromState": "MAHARASHTRA",
        "fromPin": "400053",
        "fromMobile": "9769353573",
        "fromAddType": "",
        "fromLat": "",
        "fromLng": "",
        "fromEmail": ""
      },
      "returnDetails": {
        "rtoName": "KESHAV KOTIAN",
        "rtoAdd": "D9, MRG SREEVALSAM, THIRUVAMBADY ROAD, ",
        "rtoCity": "SOUTH WEST DELHI",
        "rtoState": "Delhi",
        "rtoPin": "110037",
        "rtoMobile": "9769353573",
        "rtoAddType": "",
        "rtoLat": "",
        "rtoLng": "",
        "rtoEmail": ""
      },
      "additionalInformation": {
        "customerCode": "SMARTRFOC",
        "essentialFlag": "",
        "otpFlag": "",
        "dgFlag": "",
        "isSurface": "true",
        "isReverse": "false",
        "sellerGSTIN": "",
        "sellerERN": ""
      }
    }
  ]

  const apiConfig = {
    headers: {
      Authorization: smartr_token,
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false, // set true to verify ssl certificate
    }),
  };

  try {
    const response = await axios.post(APIs.CREATE_SMARTR_ORDER, data, apiConfig);
    console.log("response", response.data);
  } catch (error) {
    console.log("error", error);
    return next(error);
  }

  return res.status(500).send({ valid: false, message: "Incomplete route" });
}

export async function trackB2BShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const awb = "SLAWB00269";
  // const awb = "s2345aaaa"; // wrong awb
  const smartr_token = await getSMARTRToken();
  if (!smartr_token) {
    return res.status(500).send({ valid: false, message: "SMARTr token not found" });
  }
  const apiConfig = {
    headers: { Authorization: smartr_token },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false, // set true to verify ssl certificate
    }),
  };
  try {
    const api = APIs.TRACK_SMARTR_ORDER + `=${awb}`;
    const response = await axios.get(api, apiConfig);
    const responseJSON: { success: boolean; data: any[]; message?: boolean } = response.data;
    if (responseJSON.success)
      return res.status(500).send({ valid: true, message: "Incomplete route", responseJSON: responseJSON.data });
    else return res.status(500).send({ valid: false, message: "Incomplete route", resposneJSON: responseJSON.message });
  } catch (err: unknown) {
    return next(err);
  }
}

export async function cancelB2BShipment(req: ExtendedRequest, res: Response, next: NextFunction) {
  const smartr_token = await getSMARTRToken();
  if (!smartr_token) {
    return res.status(500).send({ valid: false, message: "SMARTr token not found" });
  }
  const apiPayload = [
    {
      waybillNumber: "SLAWB00269",
      WaybillStatus: "Cancelled",
      cancelledRemarks: "Dont want",
    },
  ];

  const apiConfig = {
    headers: { Authorization: smartr_token },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  };
  let responseJSON: { awb: string; message: string; success: boolean }[];
  try {
    const response = await axios.post(APIs.CANCEL_SMARTR_ORDER, apiPayload, apiConfig);
    responseJSON = response.data;
  } catch (err) {
    return next(err);
  }
  if (!responseJSON[0].success) {
    return res.status(200).send({ valid: false, message: "Incomplete route", responseJSON: responseJSON[0].message });
  } else {
    return res.status(500).send({ valid: true, message: "Incomplete route", responseJSON });
  }
}

export async function getShipemntDetails(req: ExtendedRequest, res: Response, next: NextFunction) {
  try {
    const currentDate = new Date();

    // Calculate last 30 days from today
    const date30DaysAgo = new Date(currentDate);
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    // Calculate start and end of today
    const startOfToday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const endOfToday = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

    // Calculate start and end of yesterday
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfYesterday);
    endOfYesterday.setDate(endOfYesterday.getDate() + 1);


    // Fetch today's and yesterday's orders
    const [orders, todayOrders, yesterdayOrders] = await Promise.all([
      B2COrderModel.find({
        orderStage: { $gt: 0 },
        createdAt: { $gte: date30DaysAgo, $lt: currentDate }
      }),
      B2COrderModel.find({ createdAt: { $gte: startOfToday, $lt: endOfToday } }),
      B2COrderModel.find({ createdAt: { $gte: startOfYesterday, $lt: endOfYesterday } })
    ]);
    // Extract shipment details
    const shipmentDetails = calculateShipmentDetails(orders);

    // Calculate NDR details
    const NDRDetails = calculateNDRDetails(orders);

    // Calculate COD details
    const CODDetails = calculateCODDetails(orders);

    // Calculate today's and yesterday's revenue and average shipping cost
    const todayRevenue = calculateRevenue(todayOrders);
    const yesterdayRevenue = calculateRevenue(yesterdayOrders);
    const todayAverageShippingCost = calculateAverageShippingCost(todayOrders);
    const yesterdayAverageShippingCost = calculateAverageShippingCost(yesterdayOrders);

    const todayYesterdayAnalysis = {
      todayOrdersCount: todayOrders.length,
      yesterdayOrdersCount: yesterdayOrders.length,
      todayRevenue,
      yesterdayRevenue,
      todayAverageShippingCost,
      yesterdayAverageShippingCost
    };

    return res.status(200).json({ shipmentDetails, NDRDetails, CODDetails, todayYesterdayAnalysis });

  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
}
