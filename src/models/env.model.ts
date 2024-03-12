import mongoose from "mongoose";

const EnvSchema = new mongoose.Schema({}, { timestamps: true, strict: false });

const EnvModel = mongoose.model("Env", EnvSchema);
export default EnvModel;
