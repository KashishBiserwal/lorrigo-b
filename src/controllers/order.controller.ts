import { Request, Response, NextFunction, query, response } from "express";
import type { ExtendedRequest } from "../utils/middleware";
import { B2COrderModel, B2BOrderModel } from "../models/order.model";
import ProductModel from "../models/product.model";
import HubModel from "../models/hub.model";
import CourierModel from "../models/courier.model";
import { format } from "date-fns";
import {
  MetroCitys,
  NorthEastStates,
  calculateZone,
  getPincodeDetails,
  getShiprocketToken,
  isValidPayload,
  rateCalculation,
  validateSmartShipServicablity,
  validateStringDate,
} from "../utils/helpers";
import { isValidObjectId } from "mongoose";
import Logger from "../utils/logger";
import type { ObjectId } from "mongoose";
import envConfig from "../utils/config";
import axios, { Axios } from "axios";
import APIs from "../utils/constants/third_party_apis";

// export const createB2COrder = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
//   const body = req.body;
//   // "const { isB2C } = body;

//   const isAlreadyExists = (await B2COrderModel.findOne({ order_refernce_id: body?.order_refernce_id }).lean()) !== null;
//   if (isAlreadyExists) {
//     return res.status(200).send({
//       valid: true,
//       message: `order exists with ${body?.order_refernce_id} order_reference_id`,
//     });
//   }

//   const customerDetails = body?.customerDetails;
//   if (!customerDetails) {
//     return res.status(200).send({
//       valid: false,
//       message: "customer details required",
//     });
//   }

//   if (
//     !(
//       customerDetails?.name &&
//       customerDetails?.email &&
//       customerDetails?.phone &&
//       customerDetails?.address &&
//       customerDetails?.pincode
//     )
//   ) {
//     return res.status(200).send({
//       valid: false,
//       message: "customer details: name, email, phone, address are required",
//     });
//   }

//   // validating picup address start
//   if (!body?.pickupAddress) {
//     return res.status(200).send({
//       valid: false,
//       message: "Pickup address is required",
//     });
//   }

//   const paymentMode = body?.paymentMode;
//   if (paymentMode !== 0 && paymentMode !== 1)
//     return res.status(200).send({ valid: false, message: "Invalid payment mode." });

//   if (paymentMode === 1) {
//     if (!body?.amountToCollect) {
//       return res.status(200).send({ valid: false, message: "amountToCollect must be defined for cod orders." });
//     }
//   }
//   if (paymentMode === 0) {
//     return res.status(200).send({ valid: false, message: "Prepaid not supported." });
//   }
//   const invoiceDate = body?.invoiceDate;
//   if (!invoiceDate) {
//     return res.status(200).send({
//       valid: false,
//       message: "Invoice date is requried",
//     });
//   }
//   const isValidDate = validateStringDate(invoiceDate);
//   if (!isValidDate) {
//     return res.status(200).send({ valid: false, message: "invalid invoice date" });
//   }
//   const totalOrderPrice = body?.shipmentValue + (body?.productTaxRate / 100) * body?.shipmentValue;
//   if (totalOrderPrice > 50000) {
//     return res.status(200).send({ valid: false, message: "ewaybill is required for order worth more than 50,000" });
//   }

//   try {
//     const hubDetails = await HubModel.findById(body?.pickupAddress);

//     if (!hubDetails) {
//       return res.status(200).send({ valid: false, message: "pickup address doesn't exists as hub" });
//     }
//     if (!hubDetails.hub_id) {
//       return res.status(200).send({
//         valid: false,
//         message: "Pickupaddress hub_id not available (thus: not servicable)",
//       });
//     }

//     const isServicable = await validateSmartShipServicablity(
//       1,
//       hubDetails.hub_id,
//       Number(customerDetails.pincode),
//       0,
//       []
//     );

//     if (!isServicable) {
//       return res.status(200).send({
//         valid: false,
//         message: "not servicable",
//       });
//     }
//   } catch (err) {
//     return next(err);
//   }

//   // product validation and saving to db start here...
//   if (!body?.productDetails) {
//     return res.status(200).send({
//       valid: false,
//       message: "Product details are required",
//     });
//   }
//   const { name, category, hsn_code, quantity } = body.productDetails;
//   if (
//     !(
//       typeof name === "string" ||
//       typeof category === "string" ||
//       typeof hsn_code === "string" ||
//       typeof quantity === "number"
//     )
//   ) {
//     return res.status(200).send({ valid: false, message: "Invalid payload type" });
//   }

//   const product2save = new ProductModel({
//     name: name,
//     category: category,
//     hsn_code: hsn_code,
//     quantity: quantity,
//   });
//   let savedProduct;

//   try {
//     savedProduct = await product2save.save();
//   } catch (err) {
//     return next(err);
//   }

//   // product validation and saving to end here...
//   // const isServicable = await validateSmartShipServicablity(1);
//   const order2save = new B2COrderModel({
//     ...body,
//     isB2C: true,
//     sellerId: req.seller._id,
//     productId: savedProduct._id,
//     pickupAddress: body?.pickupAddress,
//     customerDetails: customerDetails,
//   });

//   let savedOrder;
//   try {
//     const order = new B2COrderModel(order2save);
//     savedOrder = await (await order.save()).populate("productId");
//   } catch (err) {
//     return next(err);
//   }

//   return res.status(200).json({
//     valid: true,
//     order: savedOrder,
//   });
// };

// TODO create api to delete orders

export const createB2COrder = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const body = req.body;
  const vendorType = req.seller.allowedVendor;
  if (!body) return res.status(200).send({ valid: false, message: "Invalid payload" });

  const customerDetails = body?.customerDetails;
  const productDetails = body?.productDetails;

  if (
    !isValidPayload(body, [
      "order_reference_id",
      // "total_order_value",
      "payment_mode",
      "customerDetails",
      "productDetails",
      "pickupAddress",
    ])
  )
    return res.status(200).send({ valid: false, message: "Invalid payload" });

  if (!isValidPayload(productDetails, ["name", "category", "quantity", "taxRate", "taxableValue"]))
    return res.status(200).send({ valid: false, message: "Invalid payload: productDetails" });
  if (!isValidPayload(customerDetails, ["name", "phone", "address", "pincode"]))
    return res.status(200).send({ valid: false, message: "Invalid payload: customerDetails" });
  if (!isValidObjectId(body.pickupAddress))
    return res.status(200).send({ valid: false, message: "Invalid pickupAddress" });

  if (!(body.payment_mode === 0 || body.payment_mode === 1))
    return res.status(200).send({ valid: false, message: "Invalid payment mode" });
  if (body.payment_mode === 1) {
    if (!body?.amount2Collect) {
      return res.status(200).send({ valid: false, message: "amount2Collect > 0 for COD order" });
    }
  }
  if (body.total_order_value > 50000) {
    if (!isValidPayload(body, ["ewaybill"]))
      return res.status(200).send({ valid: false, message: "Ewaybill required." });
  }

  try {
    const orderWithOrderReferenceId = await B2COrderModel.findOne({
      sellerId: req.seller._id,
      order_reference_id: body?.order_reference_id,
    }).lean();

    if (orderWithOrderReferenceId) {
      const newError = new Error("Order reference Id already exists.");
      return next(newError);
    }
  } catch (err) {
    return next(err);
  }

  if (vendorType === "SS") {
    let hubDetails;
    try {
      hubDetails = await HubModel.findById(body?.pickupAddress);
      if (!hubDetails) return res.status(200).send({ valid: false, message: "Pickup address doesn't exists" });

      if (!hubDetails.hub_id)
        return res.status(200).send({ valid: false, message: "Pickup address is not regiestered at smartship" });
    } catch (err) {
      return next(err);
    }

    try {
      const isServicable = await validateSmartShipServicablity(
        1,
        // @ts-ignore
        hubDetails.hub_id,
        Number(customerDetails.pincode),
        0,
        []
      );
      if (!isServicable) return res.status(200).send({ valid: false, message: "Not servicable" });
    } catch (err) {
      return next(err);
    }
  }


  let shiprocketOrder;
  if (vendorType === "SR") {
    const order = await B2COrderModel.findOne({
      sellerId: req.seller._id,
      order_reference_id: body?.order_reference_id,
    })
    const hubDetails = await HubModel.findById(body?.pickupAddress);
    const shiprocketToken = await getShiprocketToken();
    if (!shiprocketToken) return res.status(200).send({ valid: false, message: "Invalid token" });

    const orderPayload = {
      "order_id": body?.order_reference_id,
      "order_date": format(body?.order_invoice_date, 'yyyy-MM-dd HH:mm'),
      "pickup_location": hubDetails?.name,
      // "channel_id": "shopify",
      // "comment": "Reseller: M/s Goku",
      "billing_customer_name": body?.customerDetails.name,
      "billing_last_name": body?.customerDetails.name.split(" ")[1] || "",
      "billing_address": body?.customerDetails.address,
      "billing_city": hubDetails?.city,
      "billing_pincode": body?.customerDetails.pincode,
      "billing_state": hubDetails?.state,
      "billing_country": "India",
      "billing_email": body?.customerDetails.email || "noreply@lorrigo.com",
      "billing_phone": body?.customerDetails.phone,
      "shipping_is_billing": true,
      "shipping_customer_name": body?.sellerDetails.sellerName || "",
      "shipping_last_name": body?.sellerDetails.sellerName.split(" ")[1] || "",
      "shipping_address": body?.sellerDetails.sellerAddress,
      "shipping_address_2": "",
      "shipping_city": body?.sellerDetails.sellerCity,
      "shipping_pincode": body?.sellerDetails.sellerPincode,
      "shipping_country": "India",
      "shipping_state": body?.sellerDetails.sellerState,
      "shipping_email": "",
      "shipping_phone": body?.sellerDetails.sellerPhone,
      "order_items": [
        {
          "name": productDetails.name,
          "sku": productDetails.name,
          "units": productDetails.quantity,
          "selling_price": Number(productDetails.taxableValue),
        }
      ],
      "payment_method": body?.payment_mode === 0 ? "Prepaid" : "COD",
      "sub_total": Number(productDetails?.taxableValue),
      "length": body?.orderBoxLength,
      "breadth": body?.orderBoxWidth,
      "height": body?.orderBoxHeight,
      "weight": body?.orderWeight,
    };

    try {
      shiprocketOrder = await axios.post(envConfig.SHIPROCKET_API_BASEURL + APIs.CREATE_SHIPROCKET_ORDER, orderPayload, {
        headers: {
          Authorization: shiprocketToken,
        },
      });
    } catch (error) {
      console.log("error", error);
    }
  }

  let savedProduct;
  try {
    const { name, category, hsn_code, quantity, taxRate, taxableValue } = productDetails;
    const product2save = new ProductModel({
      name,
      category,
      hsn_code,
      quantity,
      tax_rate: taxRate,
      taxable_value: taxableValue,
    });
    savedProduct = await product2save.save();
  } catch (err) {
    return next(err);
  }
  const orderboxUnit = "kg";

  const orderboxSize = "cm";

  let savedOrder;

  const data = {
    sellerId: req.seller?._id,
    shiprocket_order_id: shiprocketOrder?.data.order_id,
    shiprocket_shipment_id: shiprocketOrder?.data.shipment_id,
    orderStage: 0,
    orderStages: [{ stage: 0, stageDateTime: new Date(), action: "New" }],
    pickupAddress: body?.pickupAddress,
    productId: savedProduct._id,
    order_reference_id: body?.order_reference_id,
    payment_mode: body?.payment_mode,
    order_invoice_date: body?.order_invoice_date,
    order_invoice_number: body?.order_invoice_number.toString(),
    isContainFragileItem: body?.isContainFragileItem,
    numberOfBoxes: body?.numberOfBoxes, // if undefined, default=> 0
    orderBoxHeight: body?.orderBoxHeight,
    orderBoxWidth: body?.orderBoxWidth,
    orderBoxLength: body?.orderBoxLength,
    orderSizeUnit: body?.orderSizeUnit,
    orderWeight: body?.orderWeight,
    orderWeightUnit: body?.orderWeightUnit,
    productCount: body?.productCount,
    amount2Collect: body?.amount2Collect,
    customerDetails: body?.customerDetails,
    sellerDetails: {
      sellerName: body?.sellerDetails.sellerName,
      sellerGSTIN: body?.sellerDetails.sellerGSTIN,
      sellerAddress: body?.sellerDetails.sellerAddress,
      isSellerAddressAdded: body?.sellerDetails.isSellerAddressAdded,
      sellerPincode: Number(body?.sellerDetails.sellerPincode),
      sellerCity: body?.sellerDetails.sellerCity,
      sellerState: body?.sellerDetails.sellerState,
      sellerPhone: Number(body?.sellerDetails.sellerPhone),
    },
  };

  if (body?.total_order_value > 50000) {
    //@ts-ignore
    data.ewaybill = body?.ewaybill;
  }
  const order2save = new B2COrderModel(data);
  savedOrder = await order2save.save();
  return res.status(200).send({ valid: true, order: savedOrder });
}


export const updateB2COrder = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const body = req.body;
  // console.log("body", body);
  if (!body) return res.status(200).send({ valid: false, message: "Invalid payload" });

  const customerDetails = body?.customerDetails;
  const productDetails = body?.productDetails;

  if (
    !isValidPayload(body, [
      "order_reference_id",
      "orderId",
      "payment_mode",
      "customerDetails",
      "productDetails",
      "pickupAddress",
    ])
  )
    return res.status(200).send({ valid: false, message: "Invalid payload" });

  if (!isValidPayload(productDetails, ["name", "category", "quantity", "taxRate", "taxableValue"]))
    return res.status(200).send({ valid: false, message: "Invalid payload: productDetails" });
  if (!isValidPayload(customerDetails, ["name", "phone", "address", "pincode"]))
    return res.status(200).send({ valid: false, message: "Invalid payload: customerDetails" });
  if (!isValidObjectId(body.pickupAddress))
    return res.status(200).send({ valid: false, message: "Invalid pickupAddress" });

  if (!(body.payment_mode === 0 || body.payment_mode === 1))
    return res.status(200).send({ valid: false, message: "Invalid payment mode" });
  if (body.payment_mode === 1) {
    if (!body?.amount2Collect) {
      return res.status(200).send({ valid: false, message: "amount2Collect > 0 for COD order" });
    }
  }
  if (body.total_order_value > 50000) {
    if (!isValidPayload(body, ["ewaybill"]))
      return res.status(200).send({ valid: false, message: "Ewaybill required." });
  }

  try {
    const orderWithOrderReferenceId = await B2COrderModel.findOne({
      sellerId: req.seller._id,
      order_reference_id: body?.order_reference_id,
    }).lean();

    if (!orderWithOrderReferenceId) {
      const newError = new Error("Order not found.");
      return next(newError);
    }
  } catch (err) {
    return next(err);
  }

  let hubDetails;
  try {
    hubDetails = await HubModel.findById(body?.pickupAddress);
    if (!hubDetails) return res.status(200).send({ valid: false, message: "Pickup address doesn't exists" });

    if (!hubDetails.hub_id)
      return res.status(200).send({ valid: false, message: "Pickup address is not regiestered at smartship" });
  } catch (err) {
    return next(err);
  }

  try {
    const isServicable = await validateSmartShipServicablity(
      1,
      // @ts-ignore
      hubDetails.hub_id,
      Number(customerDetails.pincode),
      0,
      []
    );
    if (!isServicable) return res.status(200).send({ valid: false, message: "Not servicable" });
  } catch (err) {
    return next(err);
  }
  let savedProduct;

  try {
    const { _id, name, category, hsn_code, quantity, taxRate, taxableValue } = productDetails;
    // Find and update the existing product
    savedProduct = await ProductModel.findByIdAndUpdate(_id,
      {
        name,
        category,
        hsn_code,
        quantity,
        tax_rate: taxRate,
        taxable_value: taxableValue,
      });
  } catch (err) {
    return next(err);
  }

  let savedOrder;

  try {
    const data = {
      sellerId: req.seller?._id,
      orderStage: 0,
      orderStages: [{ stage: 0, stageDateTime: new Date(), action: "New" }],
      pickupAddress: body?.pickupAddress,
      productId: savedProduct?._id,
      order_reference_id: body?.order_reference_id,
      payment_mode: body?.payment_mode,
      order_invoice_date: body?.order_invoice_date,
      order_invoice_number: body?.order_invoice_number.toString(),
      isContainFragileItem: body?.isContainFragileItem,
      numberOfBoxes: body?.numberOfBoxes, // if undefined, default=> 0
      orderBoxHeight: body?.orderBoxHeight,
      orderBoxWidth: body?.orderBoxWidth,
      orderBoxLength: body?.orderBoxLength,
      orderSizeUnit: body?.orderSizeUnit,
      orderWeight: body?.orderWeight,
      orderWeightUnit: body?.orderWeightUnit,
      productCount: body?.productCount,
      amount2Collect: body?.amount2Collect,
      customerDetails: body?.customerDetails,
      sellerDetails: {
        sellerName: body?.sellerDetails.sellerName,
        sellerGSTIN: body?.sellerDetails.sellerGSTIN,
        sellerAddress: body?.sellerDetails.sellerAddress,
        isSellerAddressAdded: body?.sellerDetails.isSellerAddressAdded,
        sellerPincode: Number(body?.sellerDetails.sellerPincode),
        sellerCity: body?.sellerDetails.sellerCity,
        sellerState: body?.sellerDetails.sellerState,
        sellerPhone: Number(body?.sellerDetails.sellerPhone),
      },
    };

    if (body?.total_order_value > 50000) {
      //@ts-ignore
      data.ewaybill = body?.ewaybill;
    }
    // Find and update the existing order
    savedOrder = await B2COrderModel.findByIdAndUpdate(body?.orderId, data);

    return res.status(200).send({ valid: true, order: savedOrder });
  } catch (err) {
    // console.log(err);
    return next(err);
  }
};


export const getOrders = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const sellerId = req.seller._id;
  let { limit = 50, page = 1, status }: { limit?: number; page?: number; status?: string } = req.query;

  const obj = {
    new: [0],
    "ready-for-pickup": [2, 3, 4],
    "in-transit": [10, 27, 30],
    delivered: [11],
    ndr: [12, 13, 14, 15, 16, 17, 214],
    rto: [18, 19, 118, 198, 199, 201, 212],
  };

  limit = Number(limit);
  page = Number(page);
  page = page < 1 ? 1 : page;
  limit = limit < 1 ? 1 : limit;

  const skip = (page - 1) * limit;

  let orders, orderCount;
  try {
    let query: any = { sellerId };

    if (status && obj.hasOwnProperty(status)) {
      query.orderStage = { $in: obj[status as keyof typeof obj] };
    }

    orders = await B2COrderModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("productId")
      .populate("pickupAddress")
      .lean();

    orderCount =
      status && obj.hasOwnProperty(status)
        ? await B2COrderModel.countDocuments(query)
        : await B2COrderModel.countDocuments({ sellerId });
  } catch (err) {
    return next(err);
  }
  return res.status(200).send({
    valid: true,
    response: { orders, orderCount },
  });
};

export const createB2BOrder = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const body: B2BOrderPayload = req.body;
  if (
    !isValidPayload(body, [
      "client_name",
      "freightType",
      "pickupType",
      "InsuranceType",
      "pickupAddress",
      "invoiceNumber",
      "description",
      "totalOrderValue",
      "amount2Collect",
      "shipperGSTIN",
      "consigneeGSTIN",
      "packageDetails",
      "eways",
      "customerDetails",
    ])
  ) {
    return res.status(200).send({ valid: false, message: "Invalid Payload" });
  }
  if (!isValidObjectId(body?.pickupAddress)) {
    return res.status(200).send({ valid: "Invalid pickupAddress." });
  }
  if (!isValidObjectId(body?.customerDetails)) {
    return res.status(200).send({ valid: "Invalid customerDetails." });
  }
  if (!Array.isArray(body?.packageDetails)) {
    return res.status(200).send({ valid: false, message: "packageDetails should be array" });
  }
  if (!Array.isArray(body?.eways)) {
    return res.status(200).send({ valid: false, message: "eways should be an array" });
  }

  const isAlreadyExists = (await B2BOrderModel.findOne({ client_name: body.client_name }).lean()) !== null;
  if (isAlreadyExists) return res.status(200).send({ valid: false, message: "Client name already exists" });

  const data2save = {
    client_name: body?.client_name,
    sellerId: req.seller._id,
    freightType: body?.freightType, // 0 -> paid, 1 -> toPay
    pickupType: body?.pickupType, // 0 -> FM-Pickup, 1 -> SelfDrop
    InsuranceType: body?.InsuranceType, // 0-> OwnerRisk, 1-> Carrier Risk
    pickupAddress: body?.pickupAddress,
    invoiceNumber: body?.invoiceNumber,
    description: body?.description,
    totalOrderValue: body?.totalOrderValue,
    amount2Collect: body?.amount2Collect,
    gstDetails: {
      shipperGSTIN: body?.shipperGSTIN,
      consigneeGSTIN: body?.consigneeGSTIN,
    },
    packageDetails: [
      ...body.packageDetails,
      // {
      //   boxLength: body?.packageDetails?.boxLength,
      //   boxHeight: body?.packageDetails?.boxHeight,
      //   boxWidth: body?.packageDetails?.boxWidth,
      //   boxSizeUnit: body?.packageDetails?.boxSizeUnit, // should be either cm or m
      //   boxWeight: body?.packageDetails?.boxWeight,
      //   boxWeightUnit: body?.packageDetails?.boxWeightUnit, // should be either g or kg
      //   invoiceNumber: body?.packageDetails?.invoiceNumber,
      //   description: body?.packageDetails?.description,
      //   quantity: body?.packageDetails?.quantity,
      // },
    ],
    eways: [
      // {
      //   amount: body?.eways?.amount,
      //   ewayBill: body?.eways?.ewayBill,
      //   invoiceNumber: body?.eways?.invoiceNumber,
      // },
      ...body?.eways,
    ],
    customers: [body?.customerDetails],
  };
  try {
    const B2BOrder2Save = new B2BOrderModel(data2save);
    const savedOrder = await B2BOrder2Save.save();
    return res.status(200).send({ valid: true, order: savedOrder });
  } catch (err) {
    return next(err);
  }
  return res.status(500).send({ valid: true, message: "Incomplete route", data2save });
};

export const getCourier = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const productId = req.params.id;
  const type = req.params.type;
  const vendorType = req.seller.allowedVendor;
  let data2send: any;
  let orderDetails: any;
  if (type === "b2c") {
    try {
      orderDetails = await B2COrderModel.findById(productId);
      // console.log("orderDetails", orderDetails);
      if (orderDetails !== null) {
        //@ts-ignore
        orderDetails = await orderDetails.populate(["pickupAddress", "productId"]);
      }
    } catch (err) {
      return next(err);
    }
  } else {
    return res.status(200).send({ valid: false, message: "Invalid order type" });
    try {
      orderDetails = await B2BOrderModel.findById(productId);
    } catch (err) {
      return next(err);
    }
  }
  const shiprocketOrderID = orderDetails.shiprocket_order_id;
  const pickupPincode = orderDetails.pickupAddress.pincode;
  const deliveryPincode = orderDetails.customerDetails.get("pincode");
  const weight = orderDetails.orderWeight;
  const orderWeightUnit = orderDetails.orderWeightUnit;
  const boxLength = orderDetails.orderBoxLength;
  const boxWeight = orderDetails.orderBoxWidth;
  const boxHeight = orderDetails.orderBoxHeight;
  const sizeUnit = orderDetails.orderSizeUnit;
  const paymentType = orderDetails.payment_mode;
  const sellerId = req.seller._id;
  const collectableAmount = orderDetails?.amount2Collect;
  data2send = await rateCalculation(
    shiprocketOrderID,
    pickupPincode,
    deliveryPincode,
    weight,
    orderWeightUnit,
    boxLength,
    boxWeight,
    boxHeight,
    sizeUnit,
    paymentType,
    sellerId,
    collectableAmount,
    vendorType
  );

  return res.status(200).send({
    valid: true,
    courierPartner: data2send,
    orderDetails,
  });
};
export const getSpecificOrder = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const orderId = req.params?.id;
  if (!isValidObjectId(orderId)) {
    return res.status(200).send({ valid: false, message: "Invalid orderId" });
  }
  //@ts-ignore
  const order = await B2COrderModel.findOne({ _id: orderId, sellerId: req.seller?._id }).lean();

  return !order
    ? res.status(200).send({ valid: false, message: "So such order found." })
    : res.status(200).send({ valid: true, order: order });
};

type PickupAddress = {
  name: string;
  pincode: string;
  city: string;
  state: string;
  address1: string;
  address2?: string;
  phone: number;
  delivery_type_id?: number;
  isSuccess?: boolean;
  code?: number;
  message?: string;
  hub_id?: number;
};

type B2BOrderPayload = {
  // here client_name would be work as client_reference_id
  client_name: string;
  freightType: number;
  pickupType: number;
  InsuranceType: number;
  pickupAddress: ObjectId;
  invoiceNumber: string;
  description: string;
  totalOrderValue: number;
  amount2Collect: number;
  shipperGSTIN: string;
  consigneeGSTIN: string;
  packageDetails: any;
  eways: any;
  customerDetails: ObjectId;
};
