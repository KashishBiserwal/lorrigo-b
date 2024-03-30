import SellerModel from "../models/seller.model";
import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../utils/config";
import { validateEmail } from "../utils/helpers";
import VendorModel from "../models/vendor.model";

type SignupBodyType = { email: any; password: any; name: any };

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  const body: SignupBodyType = req.body;
  if (!(body?.password && body?.email && body.name)) {
    return res.status(200).send({
      valid: false,
      message: "name, email, password is required",
    });
  }
  if (!(typeof body.password === "string" && typeof body.email === "string" && typeof body.name === "string")) {
    return res.status(200).send({
      valid: false,
      message: "invalid body properties type",
    });
  }

  const isValidEmail = validateEmail(body?.email);

  if (!isValidEmail) {
    return res.status(200).send({
      valid: false,
      message: "invalid email address",
    });
  }

  const isAvailable = (await SellerModel.findOne({ email: body.email }).lean()) !== null;

  if (isAvailable) {
    return res.send({
      valid: false,
      message: "user already exists",
    });
  }

  const hashPassword = await bcrypt.hash(body?.password, config.SALT_ROUND!);

  const vendors = await VendorModel.find({});
  const vendorsId = vendors.reduce((acc: any, cv: any) => {
    return acc.concat(cv._id);
  }, []);

  const user = new SellerModel({ name: body?.name, email: body?.email, password: hashPassword, vendors: vendorsId });

  let savedUser;
  try {
    savedUser = await user.save();
  } catch (err) {
    return next(err);
  }

  return res.send({
    valid: true,
    user: {
      email: savedUser.email,
      id: savedUser._id,
      name: savedUser.name,
      isVerified: savedUser.isVerified,
      vendors: savedUser.vendors,
    },
  });
};

type LoginBodyType = {
  email?: string;
  password?: string;
};

export const login = async (req: Request, res: Response) => {
  const body: LoginBodyType = req.body;

  if (!(body?.email && body?.password)) {
    return res.status(200).send({
      valid: false,
      message: "Invalid login credentials",
    });
  }

  const existingUser = await SellerModel.findOne({ email: body.email }).lean();
  if (!existingUser) {
    return res.status(200).send({
      valid: false,
      message: "User doesn't exist",
    });
  }

  const isValidPassword = bcrypt.compareSync(body?.password, existingUser.password);

  if (!isValidPassword) {
    return res.status(200).send({
      valid: false,
      message: "incorrect password",
    });
  }

  const token = jwt.sign(existingUser, config.JWT_SECRET!, { expiresIn: "7d" });

  return res.status(200).send({
    valid: true,
    user: {
      email: existingUser.email,
      id: existingUser._id,
      isVerified: false,
      token,
    },
  });
};
