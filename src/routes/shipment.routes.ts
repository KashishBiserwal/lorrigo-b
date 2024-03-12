import { Router } from "express";
import {
  trackB2BShipment,
  cancelB2BShipment,
  cancelShipment,
  createB2BShipment,
  createShipment,
  trackShipment,
} from "../controllers/shipment.controller";

const shipmentRouter = Router();

//@ts-ignore
shipmentRouter.post("/", createShipment);

//@ts-ignore
shipmentRouter.post("/cancel", cancelShipment);

//@ts-ignore
shipmentRouter.get("/track", trackShipment);

//@ts-ignore
shipmentRouter.post("/b2b", createB2BShipment);

//@ts-ignore
shipmentRouter.post("/b2b/cancel", cancelB2BShipment);

//@ts-ignore
shipmentRouter.get("/b2b/track", trackB2BShipment);

export default shipmentRouter;
