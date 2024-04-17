import { Router } from "express";
import {
  trackB2BShipment,
  cancelB2BShipment,
  cancelShipment,
  createB2BShipment,
  createShipment,
  trackShipment,
  getShipemntDetails,
  orderManifest
} from "../controllers/shipment.controller";

const shipmentRouter = Router();

//@ts-ignore
shipmentRouter.post("/", createShipment);

//@ts-ignore
shipmentRouter.post("/cancel", cancelShipment);

//@ts-ignore
shipmentRouter.get("/track", trackShipment);

//@ts-ignore
shipmentRouter.post("/manifest", orderManifest);

//@ts-ignore
shipmentRouter.post("/order-reattempt", orderManifest);

//@ts-ignore
shipmentRouter.post("/b2b", createB2BShipment);

//@ts-ignore
shipmentRouter.post("/b2b/cancel", cancelB2BShipment);

//@ts-ignore
shipmentRouter.get("/b2b/track", trackB2BShipment);

//@ts-ignore
shipmentRouter.get('/dashboard', getShipemntDetails)

export default shipmentRouter;
