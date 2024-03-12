export const HUB_REGISTRATION = "/v2/app/Fulfillmentservice/hubRegistration";
export const HUB_UPDATE = "/v2/app/Fulfillmentservice/updateHubDetails";
export const HUB_DELETE = "/v2/app/Fulfillmentservice/deleteHub";

export const HUB_SERVICEABILITY = "/v2/app/Fulfillmentservice/ServiceabilityHubWise";

export const CREATE_SHIPMENT = "/v2/app/Fulfillmentservice/orderRegistration";
export const CANCEL_SHIPMENT = "/v2/app/Fulfillmentservice/orderCancellation";
/**
 * append order_reference_id
 * eg: TRACK_SHIPMENT + order_reference_id
 */
export const TRACK_SHIPMENT = "/v1/Trackorder?order_reference_ids"; // url => TRACK_SHIPMENT+"=order_reference_id"

export const CREATE_SMARTR_ORDER = "https://uat.smartr.in/api/v1/add-order";
/**
 * append awbnumber
 * eg:TRACK_SMARTR_ORDER + ""=awbNumber"
 */
const TRACK_SMARTR_ORDER = "https://uat.smartr.in/api/v1/tracking/surface/?awbs";
const CANCEL_SMARTR_ORDER = "https://uat.smartr.in/api/v1/cancellation/";
/**
 * for signle apply query with key pincode=pincodeNumber
 */
const PIN_CODE = "https://uat.smartr.in/api/v1/pincode/";

const APIs = {
  HUB_REGISTRATION,
  HUB_UPDATE,
  HUB_DELETE,
  CREATE_SHIPMENT,
  HUB_SERVICEABILITY,
  CANCEL_SHIPMENT,
  TRACK_SHIPMENT,
  CREATE_SMARTR_ORDER,
  TRACK_SMARTR_ORDER,
  /**
   * append awbnumber
   * eg:TRACK_SMARTR_ORDER + ""=awbNumber"
   */
  CANCEL_SMARTR_ORDER,
  /**
   * for signle apply query with key pincode=pincodeNumber
   */
  PIN_CODE,
};
export default APIs;
