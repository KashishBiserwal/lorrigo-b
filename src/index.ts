import express from "express";
// import * as dotenv from "dotenv";
import type { Request, Response } from "express";
import authRouter from "./routes/auth.routes";
import mongoose from "mongoose";
const app = express();
import config from "./utils/config";
import orderRouter from "./routes/order.routes";
import { AuthMiddleware, ErrorHandler } from "./utils/middleware";
import { addVendors, getSellers, ratecalculatorController, updateVendor4Seller } from "./utils/helpers";
import hubRouter from "./routes/hub.routes";
import cors from "cors";
import customerRouter from "./routes/customer.routes";
import morgan from "morgan";
import shipmentRouter from "./routes/shipment.routes";
import sellerRouter from "./routes/seller.routes";
import runCron, { CONNECT_SMARTR, CONNECT_SMARTSHIP } from "./utils/cronjobs";
import Logger from "./utils/logger";

app.use(cors({ origin: "*" }));

app.use(express.json());

//@ts-ignore
morgan.token("reqbody", (req, res) => JSON.stringify(req.body));
app.use(morgan(":method :url :status - :response-time ms - :reqbody"));

app.get("/ping", (_req, res: Response) => {
  return res.send("pong");
});

if (!config.MONGODB_URI) {
  Logger.log("MONGODB_URI doesn't exists: " + config.MONGODB_URI);
  process.exit(0);
}
mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    Logger.plog(" db connected successfully");
    CONNECT_SMARTSHIP();
    CONNECT_SMARTR();
  })
  .catch((err) => {
    Logger.log(err.message);
  });

app.use("/api/auth", authRouter);
app.post("/api/vendor", addVendors);
app.get("/api/getsellers", getSellers);
app.post("/api/seller_vendor", updateVendor4Seller);
// @ts-ignore (as Request object is extended with new property seller)
// app.use(AuthMiddleware);

//@ts-ignore
app.post("/api/ratecalculator", AuthMiddleware, ratecalculatorController);
//@ts-ignore
app.use("/api/seller", AuthMiddleware, sellerRouter);
//@ts-ignore
app.use("/api/customer", AuthMiddleware, customerRouter);
//@ts-ignore
app.use("/api/hub", AuthMiddleware, hubRouter);
//@ts-ignore
app.use("/api/order", AuthMiddleware, orderRouter);
//@ts-ignore
app.use("/api/shipment", AuthMiddleware, shipmentRouter);

app.use(ErrorHandler);
app.use("*", (req: Request, res: Response) => {
  return res.status(404).send({
    valid: false,
    message: "invalid route",
  });
});

runCron();

app.listen(config.PORT, () => Logger.plog("server running on port " + config.PORT));
