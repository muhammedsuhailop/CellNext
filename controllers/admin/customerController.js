const { ADMIN_MESSAGES } = require("../../constents/AdminMessages");
const { HttpStatusCode } = require("../../constents/HttpStatusCodes");
const User = require("../../models/userSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 8;
    if (page < 1) page = 1;
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    });

    const totalPages = Math.ceil(count / limit);
    if (page > totalPages) page = totalPages;
    const admin = await User.findById(req.session._id);

    res.render("customers", {
      admin,
      data: userData,
      totalPages: totalPages,
      currentPage: page,
      searchQuery: search,
      searchAction: "/admin/users",
    });
  } catch (error) {
    console.error("Error on customers page", error);
    res.redirect("/admin/error-page");
  }
};

const blockCustomer = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(HttpStatusCode.BAD_REQUEST)
        .json({ error: "User ID is required" });
    }

    const result = await User.updateOne(
      { _id: id },
      { $set: { isBlocked: true } },
    );

    if (result.matchedCount === 0) {
      return res
        .status(HttpStatusCode.NOT_FOUND)
        .json({ error: ADMIN_MESSAGES.ERROR.NOT_FOUND });
    }

    res
      .status(HttpStatusCode.OK)
      .json({ message: ADMIN_MESSAGES.SUCCESS.USER_BLOCKED });
  } catch (error) {
    console.error("Error in blocking user:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ error: ADMIN_MESSAGES.ERROR.USER_BLOCK_FAILED });
  }
};

const unblockCustomer = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(HttpStatusCode.BAD_REQUEST)
        .json({ error: "User ID is missing" });
    }

    const result = await User.updateOne(
      { _id: id },
      { $set: { isBlocked: false } },
    );

    if (result.matchedCount === 0) {
      return res
        .status(HttpStatusCode.NOT_FOUND)
        .json({ error: ADMIN_MESSAGES.ERROR.NOT_FOUND });
    }

    res
      .status(HttpStatusCode.OK)
      .json({ message: ADMIN_MESSAGES.SUCCESS.USER_UNBLOCKED });
  } catch (error) {
    console.log("Error in unblocking user:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ error: ADMIN_MESSAGES.ERROR.USER_UNBLOCK });
  }
};

module.exports = {
  customerInfo,
  blockCustomer,
  unblockCustomer,
};
