import { NextFunction, Response } from "express";
import { ExtendedRequest } from "../utils/middleware";
import SellerModel from "../models/seller.model";
import { generateRemittanceId } from "../utils";
import { B2COrderModel } from "../models/order.model";
import RemittanceModel from "../models/remittance-modal";

export const getSeller = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const seller = await req.seller;
  delete seller?.password;
  delete seller?.__v;
  return res.status(200).send({ valid: true, seller });
};

export const updateSeller = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const body = req.body;
  const sellerId = req.seller._id;

  if (body?.password) return res.status(200).send({ valid: false, message: "Invalid payload" });

  try {
    const updatedSeller = await SellerModel.findByIdAndUpdate(sellerId, { ...body }, { new: true }).select([
      "-__v",
      "-password",
      "-margin",
    ]);

    return res.status(200).send({
      valid: true,
      message: "updated success",
      seller: updatedSeller,
    });
  } catch (err) {
    return next(err);
  }
};
export const deleteSeller = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const seller = req.seller;
  const sellerId = seller._id;

  try {
    const deletedSeller = await SellerModel.findByIdAndDelete(sellerId);
    return res.status(200).send({
      valid: true,
      seller: deletedSeller,
    });
  } catch (err) {
    return next(err);
  }
  return res.status(200).send({
    valid: false,
    message: "incomplete route",
  });
};

export const getRemittaces = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const remittanceOrders = await RemittanceModel.find({ sellerId: req.seller._id });
    if (!remittanceOrders) return res.status(200).send({ valid: false, message: "No Remittance found" });

    return res.status(200).send({
      valid: true,
      remittanceOrders,
    });
  } catch (error) {
    return next(error)
  }
}

export const getRemittaceByID = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const remittanceOrder = await RemittanceModel.findById(req.params.id);
    if (!remittanceOrder) return res.status(200).send({ valid: false, message: "No Remittance found" });

    return res.status(200).send({
      valid: true,
      remittanceOrder,
    });
  } catch (error) {
    return next(error)
  }
}