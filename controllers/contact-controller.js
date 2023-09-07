import Contact from "../models/contact.js";
import { ctrlWrapper } from "../decorators/index.js";
import { HttpError } from "../helpers/index.js";

const getAll = async (req, res) => {
  const { _id: owner } = req.user;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = { owner };
  const favorite = req.query.favorite;

  if (favorite) {
    filter.favorite = favorite ? favorite === "true" : "false";
  }

  const result = await Contact.find(filter, "-createdAt -updatedAt", {
    skip,
    limit,
  });
  res.json(result);
};

const getById = async (req, res) => {
  const { id } = req.params;
  const contact = await Contact.findById(id);

  if (!contact) {
    throw HttpError(404, `Contact with id=${id} not found!`);
  }

  res.json(contact);
};

const add = async (req, res) => {
  const { _id: owner } = req.user;
  const result = await Contact.create({ ...req.body, owner });
  res.status(201).json(result);
};

const updateById = async (req, res) => {
  const { id } = req.params;
  const contact = await Contact.findById(id);

  if (!contact) {
    throw HttpError(404, `Contact with id=${id} not found!`);
  }

  const result = await Contact.findByIdAndUpdate(id, req.body, { new: true });
  res.json(result);
};

const updateFavorite = async (req, res) => {
  const { id } = req.params;

  const updatedContact = await Contact.findByIdAndUpdate(
    id,
    { $set: { favorite: true, ...req.body } },
    { new: true }
  );

  if (!updatedContact) {
    throw HttpError(404, `Contact with id=${id} not found!`);
  }
  res.json(updatedContact);
};

const deleteById = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user._id;

  const result = await Contact.findByIdAndDelete({
    _id: id,
    owner: currentUserId,
  });

  if (!result) {
    throw HttpError(404, `Contact with id=${id} not found!`);
  }

  res.json({
    message: "Delete success",
  });
};

export default {
  getAll: ctrlWrapper(getAll),
  add: ctrlWrapper(add),
  getById: ctrlWrapper(getById),
  updateById: ctrlWrapper(updateById),
  updateFavorite: ctrlWrapper(updateFavorite),
  deleteById: ctrlWrapper(deleteById),
};
