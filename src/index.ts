import express from "express";
// import * as dotenv from "dotenv";
import type { Request, Response } from "express";
import authRouter from "./routes/auth.routes";
import mongoose from "mongoose";
const app = express();
import config from "./utils/config";
import orderRouter from "./routes/order.routes";
import { AuthMiddleware, ErrorHandler } from "./utils/middleware";
import { addVendors, getSellers, ratecalculatorController } from "./utils/helpers";
import hubRouter from "./routes/hub.routes";
import cors from "cors";
import customerRouter from "./routes/customer.routes";
import morgan from "morgan";
import shipmentRouter from "./routes/shipment.routes";
import sellerRouter from "./routes/seller.routes";
import runCron, { CONNECT_SMARTR, CONNECT_SMARTSHIP } from "./utils/cronjobs";
import Logger from "./utils/logger";

app.use(cors());

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

app.use("/auth", authRouter);
app.post("/vendor", addVendors);
app.get("/getsellers", getSellers);

// @ts-ignore (as Request object is extended with new property seller)
app.use(AuthMiddleware);

//@ts-ignore
app.post("/ratecalculator", ratecalculatorController);
app.use("/seller", sellerRouter);
app.use("/customer", customerRouter);
app.use("/hub", hubRouter);
app.use("/order", orderRouter);
app.use("/shipment", shipmentRouter);

app.use(ErrorHandler);
app.use("*", (req: Request, res: Response) => {
  return res.status(404).send({
    valid: false,
    message: "invalid route",
  });
});

runCron();

app.listen(config.PORT, () => Logger.plog("server running on port " + config.PORT));
