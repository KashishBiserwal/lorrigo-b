import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "./config";
import SellerModel from "../models/seller.model";
import Logger from "./logger";

export type ExtendedRequest = Request & {
  seller: any;
};

export const AuthMiddleware = async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  const token = req.headers?.authorization;

  if (!token) {
    return res.status(200).send({
      valid: false,
      message: "token is required",
    });
  }

  const splittedToken = token.split(" ");
  if (splittedToken[0] !== "Bearer") {
    return res.status(200).send({
      valid: false,
      message: "invalid token_type",
    });
  }

  let decryptedToken: any;
  try {
    decryptedToken = jwt.verify(splittedToken[1], config.JWT_SECRET!);
  } catch (err: any) {
    return next(err);
  }

  // extracting seller using token and seller model
  const sellerEmail = decryptedToken?.email;
  if (!sellerEmail) {
    Logger.log("Error: token doens't contain email, ", sellerEmail);
    const err = new Error("Error: token doens't contain email");
    return next(err);
  }

  const seller = await SellerModel.findOne({ email: sellerEmail }).lean();
  if (!seller) return res.status(200).send({ valid: false, message: "Seller no more exists" });
  req.seller = seller;
  next();
};

export const ErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    if (err.name === "JsonWebTokenError") {
      return res.status(200).send({
        valid: false,
        message: "Invalid JWT token",
      });
    } else if (err.name === "TokenExpiredError") {
      return res.status(200).send({
        valid: false,
        message: "Token expired",
      });
    } else if (err.name === "CastError") {
      return res.status(200).send({
        valid: false,
        message: "Invalid Id",
      });
    }
    return res.status(200).send({
      valid: false,
      // @ts-ignore
      message:  err?.response?.data?.message ?? err?.message ?? "Something went wrong",
    });
  } else {
    return res.status(200).send({
      valid: false,
      message: "Something went wrong",
    });
  }
};
