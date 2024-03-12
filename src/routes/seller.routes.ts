import { Router } from "express";
import { deleteSeller, getSeller, updateSeller } from "../controllers/seller.controller";

const sellerRouter = Router();

//@ts-ignore
sellerRouter.put("/", updateSeller);

//@ts-ignore
sellerRouter.get("/", getSeller);

//@ts-ignore
sellerRouter.delete("/", deleteSeller);

export default sellerRouter;
