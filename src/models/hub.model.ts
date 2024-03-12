import mongoose from "mongoose";

const HubSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.ObjectId, ref: "Seller", required: true },

  //  "hub_details":{
  name: { type: String, required: true },
  pincode: { type: Number, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  address1: { type: String, required: true },
  address2: { type: String, required: false },
  phone: { type: Number, required: true },
  delivery_type_id: { type: Number, required: false },

  isSuccess: { type: Boolean, required: false },
  code: { type: Number, required: false },
  message: { type: String, required: false },
  hub_id: { type: Number, required: false },
});

const HubModel = mongoose.model("Hub", HubSchema);
export default HubModel;
