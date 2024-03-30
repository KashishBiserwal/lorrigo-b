import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  walletBalance: { type: Number, default: 0, min: 0 },
  companyName: { type: String, required: false },
  entityType: { type: String, required: false },
  address: { type: String, required: false },
  gstno: { type: String, required: false },
  panno: { type: String, required: false },
  margin: { type: Number, min: 0, max: 100, default: 20 },
  vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vendors" }],
  isVerified: { type: Boolean, default: false },
});

const SellerModel = mongoose.model("Seller", sellerSchema);

export default SellerModel;
