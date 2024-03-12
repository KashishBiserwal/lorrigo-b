import mongoose from "mongoose";

// const B2COrderSchema = new mongoose.Schema({
//   sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
//   // isB2C: { type: Boolean, required: true },
//   //  will require seller details / maybe hub details
//   orderStage: { type: Number, default: 0 }, // 0 - no shipped, 1 -shipped
//   order_refernce_id: { type: String, required: true, unique: true },
//   pickupAddress: { type: mongoose.Schema.Types.ObjectId, ref: "Hub" },
//   productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },
//   shipmentValue: { type: Number, required: true },
//   productTaxRate: { type: Number, required: true, min: 0, max: 100 },
//   isContainFragileItem: { type: Boolean, required: true },
//   invoiceNumber: { type: String, required: true },
//   invoiceDate: { type: String, required: true },
//   paymentMode: { type: String, required: true }, // 1 = COD, 0 = prepaid
//   numberOfBox: { type: Number, required: true },
//   packageType: { type: String, required: true },
//   boxLength: { type: Number, required: true },
//   boxWidth: { type: Number, required: true },
//   boxHeight: { type: Number, required: true },
//   sizeUnit: { type: String, required: true },
//   boxWeight: { type: Number, required: true },
//   weightUnit: { type: String, required: true },
//   ewaybill: { type: String, required: false },
//   amountToCollect: { type: Number, required: false, default: 0 },
//   customerDetails: {
//     name: { type: String, required: true },
//     email: { type: String, required: true },
//     phone: { type: String, required: true },
//     address: { type: String, required: true },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     pincode: { type: String, required: true },
//     type: mongoose.Schema.Types.Map,
//     required: true,
//   },
// });

const B2COrderSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
  orderStage: { type: Number, required: true }, // 0 -> not shipped, 1 -> shipped, 2 -> Cancelation Request, 3->Canceled
  pickupAddress: { type: mongoose.Schema.Types.ObjectId, ref: "Hub" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products", required: true },

  order_reference_id: { type: String, required: true },
  payment_mode: { type: Number, required: true }, // 0 -> prepaid, 1 -> COD
  order_invoice_date: { type: String, required: true },
  order_invoice_number: { type: Number, required: true },
  isContainFragileItem: { type: Boolean, required: true, default: false },
  numberOfBoxes: { type: Number, required: true, default: 1 },
  orderBoxHeight: { type: Number, required: true },
  orderBoxWidth: { type: Number, required: true },
  orderBoxLength: { type: Number, required: true },
  orderSizeUnit: { type: String, required: true },

  orderWeight: { type: Number, required: true },
  orderWeightUnit: { type: String, required: true },

  // productCount: { type: Number, required: true, min: 1, default: 0 },
  amount2Collect: { type: Number, required: false, min: 0, default: 0 },
  ewaybill: { type: Number, required: false },

  customerDetails: {
    type: mongoose.Schema.Types.Map,
    required: true,
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: false },
    state: { type: String, required: false },
    pincode: { type: String, required: true },
  },

  /*
    product -> shipmentValue, taxrates
  */
});

// const OrderSchema = new mongoose.Schema({
//   //  request info
//   ip_address: {
//     type: String,
//     required: true,
//   },
//   run_type: {
//     type: String,
//     required: true,
//   },
//   browser_name: {
//     type: String,
//     required: true,
//   },
//   location: {
//     type: String,
//     required: true,
//   },
//   shipment_type: {
//     type: Number,
//     required: true,
//   },
//   // order info
//   client_order_refernce_id: {
//     type: String,
//     required: true,
//   },
//   order_collectable_amount: {
//     type: String,
//     required: true,
//   },
//   total_order_value: {
//     type: String,
//     required: true,
//   },
//   payment_type: {
//     type: String,
//     required: true,
//   },
//   package_order_weight: {
//     type: String,
//     required: true,
//   },
//   package_order_length: {
//     type: String,
//     required: true,
//   },
//   package_order_height: {
//     type: String,
//     required: true,
//   },
//   package_order_width: {
//     type: String,
//     required: true,
//   },
//   shipper_hub_id: {
//     type: String,
//     required: true,
//   },
//   shipper_gst_no: {
//     type: String,
//     required: true,
//   },
//   order_invoice_date: {
//     type: String,
//     required: true,
//   },
//   productDetails: [
//     {
//       type: mongoose.Schema.ObjectId,
//       ref: "Products",
//     },
//   ],
// });

/*
const B2BOrderSchema = new mongoose.Schema({
  lrNo: { type: String, required: true },
  isManual: { type: Boolean, required: false },
  clientName: { type: String, required: true },
  paymentType: { type: String, required: true },
  pickupType: { type: String, required: true },
  insuranceType: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  productDescription: { type: String, required: true },
  totalShipmentWeight: { type: String, required: true },
  client_reference_order_id: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true },
  sizeUnit: { type: String, required: true },
  dimensionsQuantity: { type: Number, required: true },
  invoiceType: { type: String, required: true },
  amount2collect: { type: String, required: true },
  ewaybill: { type: String, required: true },
  amount: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  shipperGST: { type: String, required: true },
  consigneeGST: { type: String, required: true },
  pickupAddress: { type: String, required: true },
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: false },
    state: { type: String, required: false },
    pincode: { type: String, required: true },
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});
*/
const packageDetailsSchema = new mongoose.Schema({
  boxLength: { type: Number, required: true },
  boxHeight: { type: Number, required: true },
  boxWidth: { type: Number, required: true },
  boxSizeUnit: { type: String, required: true }, // should be either cm or m
  boxWeight: { type: Number, required: true },
  boxWeightUnit: { type: String, required: true }, // should be either g or kg
  invoiceNumber: { type: String, required: false },
  description: { type: String, required: false },
  quantity: { type: Number, required: true, default: 1 },
});
const ewaysSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  ewayBill: { type: String, required: true },
  invoiceNumber: { type: Number, required: true },
});
const B2BOrderSchema = new mongoose.Schema({
  client_name: { type: String, required: true },
  sellerId: { type: String, required: true },
  freightType: { type: Number, required: true, default: 0 }, // 0 -> paid, 1 -> toPay
  pickupType: { type: Number, required: true, default: 0 }, // 0 -> FM-Pickup, 1 -> SelfDrop
  InsuranceType: { type: Number, required: true, default: 0 }, // 0-> OwnerRisk, 1-> Carrier Risk
  pickupAddress: { type: mongoose.Schema.Types.ObjectId, ref: "Hub" },
  invoiceNumber: { type: String, required: false },
  description: { type: String, required: false },
  totalOrderValue: { type: Number, required: true },
  amount2Collect: { type: Number, required: false, default: 0 },
  gstDetails: {
    shipperGSTIN: { type: String, required: true },
    consigneeGSTIN: { type: String, required: true },
  },
  packageDetails: {
    type: [packageDetailsSchema],
    required: true,
  },
  eways: {
    type: [ewaysSchema],
    required: true,
  },
  customers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2BCustomer",
    },
  ],
});
export const B2COrderModel = mongoose.model("B2COrders", B2COrderSchema);
export const B2BOrderModel = mongoose.model("B2BOrder", B2BOrderSchema);
