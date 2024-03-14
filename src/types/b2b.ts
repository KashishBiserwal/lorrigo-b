import HubModel from "../models/hub.model";
import B2BCustomerModel from "../models/customer.model";
import { ewaysSchema, packageDetailsSchema } from "../models/order.model";

export interface OrderPayload {
  client_name: string;
  sellerId: string;
  freightType: Number;
  pickupType: Number;
  InsuranceType: Number;
  pickupAddress: typeof HubModel[];
  invoiceNumber: string;
  description: string;
  totalOrderValue: Number;
  amount2Collect: Number;
  gstDetails: string;
  packageDetails: typeof packageDetailsSchema[];
  eways: typeof ewaysSchema[];
  customers: typeof B2BCustomerModel;
}
