import mongoose from "mongoose";

const currentTime = new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds();
const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    weightSlab: { type: Number, required: true },
    weightUnit: { type: String, required: true },
    incrementWeight: { type: Number, required: true },
    type: { type: String, required: true }, // surface , air
    pickupTime: { type: String, required: true, defualt: currentTime },
    withinCity: {
      basePrice: { type: Number, required: true, min: 0 },
      incrementPrice: { type: Number, required: true, min: 0 },
    },
    withinZone: {
      basePrice: { type: Number, required: true, min: 0 },
      incrementPrice: { type: Number, required: true, min: 0 },
    },
    withinMetro: {
      basePrice: { type: Number, required: true, min: 0 },
      incrementPrice: { type: Number, required: true, min: 0 },
    },
    withinRoi: {
      basePrice: { type: Number, required: true, min: 0 },
      incrementPrice: { type: Number, required: true, min: 0 },
    },
    northEast: {
      basePrice: { type: Number, required: true, min: 0 },
      incrementPrice: { type: Number, required: true, min: 0 },
    },
    smartship_carrier_id: { type: Number, required: true },
  },
  { timestamps: true }
);

const VendorModel = mongoose.model("Vendors", vendorSchema);
export default VendorModel;
