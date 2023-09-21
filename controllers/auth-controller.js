import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import gravatar from "gravatar";
import Jimp from "jimp";
import { nanoid } from "nanoid";

import fs from "fs/promises";
import path from "path";

import User from "../models/user.js";
import { ctrlWrapper } from "../decorators/index.js";
import { HttpError, sendEmail, createVerifyEmail } from "../helpers/index.js";

const avatarPath = path.join(process.cwd(), "public", "avatars");

const { JWT_SECRET } = process.env;

const register = async (req, res) => {
  const { email, password, subscription } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, `Email ${email} in use!`);
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const verificationToken = nanoid();

  const avatarURL = gravatar.url(email, { s: "200", r: "pg", d: "mm" });

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
    verificationToken,
  });

  const verifyEmail = createVerifyEmail({ email, verificationToken });

  await sendEmail(verifyEmail);

  res.status(201).json({
    name: newUser.name,
    email: newUser.email,
    subscription: newUser.subscription,
    avatarURL: newUser.avatarURL,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, "Email or password invalid");
  }

  if (!user.verify) {
    throw HttpError(401, "Email not verify!");
  }

  const passwordCompare = await bcrypt.compare(password, user.password);

  if (!passwordCompare) {
    throw HttpError(401, "Email or password invalid");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "23h" });

  await User.findByIdAndUpdate(user._id, { token });

  res.json({ token });
};

const verify = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) {
    throw HttpError(404, "User not found!");
  }
  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: "",
  });

  res.json({
    message: "Verification successful!",
  });
};

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(404, "missing required field email!");
  }

  if (user.verify) {
    throw HttpError(400, "Verification has already been passed!");
  }

  const verifyEmail = createVerifyEmail({
    email,
    verificationToken: user.verificationToken,
  });

  await sendEmail(verifyEmail);

  res.json({
    message: "Verification email sent",
  });
};

const getCurrent = async (req, res) => {
  const { name, email } = req.user;
  res.json({ name, email });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.json({
    message: "Logout success",
  });
};

const updateAvatar = async (req, res) => {
  try {
    const { path: oldPath, filename } = req.file;
    const newPath = path.join(avatarPath, filename);

    const image = await Jimp.read(oldPath);
    await image.resize(250, 250).writeAsync(newPath);

    const avatarURL = path.join("avatars", filename);
    req.user.avatarURL = avatarURL;
    await req.user.save();

    res.json({
      avatarURL,
    });
  } catch (error) {
    console.error(error);
    await fs.unlink(req.file.path);
    throw HttpError(500, "Error updating avatar!");
  }
};

export default {
  register: ctrlWrapper(register),
  verify: ctrlWrapper(verify),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateAvatar: ctrlWrapper(updateAvatar),
};
