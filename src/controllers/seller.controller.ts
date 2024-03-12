import { NextFunction, Response } from "express";
import { ExtendedRequest } from "../utils/middleware";
import SellerModel from "../models/seller.model";

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
