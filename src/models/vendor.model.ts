import mongoose from "mongoose";

const currentTime = new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds();

const pricingSchema = {
  basePrice: { type: Number, required: true, min: 0 },
  incrementPrice: { type: Number, required: true, min: 0 },
};

const codSchema = {
  hard: { type: Number, required: true, min: 0, defualt: 40 },
  percent: { type: Number, required: true, min: 0, max: 100, defualt: 1.5 },
};

export const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weightSlab: { type: Number, required: true },
    weightUnit: { type: String, required: true },
    codCharge: { type: codSchema, required: true, default: { hard: 40, percent: 1.5 } },
    incrementWeight: { type: Number, required: true },
    type: { type: String, required: true }, // surface , air
    pickupTime: { type: String, required: true, defualt: currentTime },
    withinCity: { type: pricingSchema, required: true },
    withinZone: { type: pricingSchema, required: true },
    withinMetro: { type: pricingSchema, required: true },
    withinRoi: { type: pricingSchema, required: true },
    northEast: { type: pricingSchema, required: true },
    smartship_carrier_id: { type: Number, required: true },
  },
  { timestamps: true }
);

const VendorModel = mongoose.model("Vendors", vendorSchema);
export default VendorModel;
