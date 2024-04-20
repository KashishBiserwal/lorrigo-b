import { Router } from "express";
import { deleteSeller, getSeller, updateSeller, getRemittaces, getRemittaceByID } from "../controllers/seller.controller";

const sellerRouter = Router();

//@ts-ignore
sellerRouter.put("/", updateSeller);

//@ts-ignore
sellerRouter.get("/", getSeller);

//@ts-ignore
sellerRouter.delete("/", deleteSeller);

//@ts-ignore
sellerRouter.get("/remittance", getRemittaces);

//@ts-ignore
sellerRouter.get("/remittance/:id", getRemittaceByID);

export default sellerRouter;
