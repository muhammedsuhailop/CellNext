const { ADMIN_MESSAGES } = require("../../constents/adminMessages");
const { HttpStatusCode } = require("../../constents/httpStatusCodes");
const Category = require("../../models/categorySchema");
const ProductV2 = require("../../models/productsSchemaV2");
const User = require("../../models/userSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const categoryInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 5;
    if (page < 1) page = 1;

    const searchCondition = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const categoryData = await Category.find(searchCondition)
      .sort({ name: 1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Category.countDocuments(searchCondition);

    const totalPages = Math.ceil(count / limit);
    if (page > totalPages) page = totalPages;
    const admin = await User.findById(req.session._id);

    res.render("category", {
      admin,
      data: categoryData,
      totalPages: totalPages,
      currentPage: page,
      searchQuery: search,
      searchAction: "/admin/category",
    });
  } catch (error) {
    console.error("Error on category page", error);
    res.redirect("/admin/error-page");
  }
};

const addCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res
        .status(HttpStatusCode.BAD_REQUEST)
        .json({ error: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();

    return res.json({ message: "Category added successfully" });
  } catch (error) {
    console.log("Unexpected error adding new category", error);
    return res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ error: ADMIN_MESSAGES.ERROR.INTERNAL_SERVER_ERROR });
  }
};

const listCategory = async (req, res) => {
  try {
    const { id, isListed } = req.body;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.json({ message: "Category listed successfully!" });
  } catch (error) {
    console.log("Error while listing category:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ error: ADMIN_MESSAGES.ERROR.LISTING_CATEGORY });
  }
};

const unlistCategory = async (req, res) => {
  try {
    const { id, isListed } = req.body;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.json({ message: "Category unlisted successfully!" });
  } catch (error) {
    console.log("Error while unlisting category:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ error: ADMIN_MESSAGES.ERROR.UNLISTING_CATEGORY });
  }
};

const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    const admin = await User.findById(req.session._id);
    res.render("edit-category", { category, admin });
  } catch (error) {
    console.error("Error while loading edit category:", error);
    res.redirect("/admin/error-page");
  }
};

const editCategory = async (req, res) => {
  try {
    const { id } = req.query;
    const { name, description } = req.body;
    const existingCategory = await Category.findOne({ name });
    if (existingCategory && existingCategory._id.toString() !== id) {
      return res.status(HttpStatusCode.BAD_REQUEST).json({
        errors: { name: ADMIN_MESSAGES.ERROR.DUPLICATE_CATEGORY_NAME },
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true },
    );

    if (updatedCategory) {
      return res
        .status(HttpStatusCode.OK)
        .json({ message: ADMIN_MESSAGES.SUCCESS.CATEGORY_UPDATED });
    } else {
      console.log("Category not found");
      return res.status(HttpStatusCode.NOT_FOUND).json({
        errors: { general: ADMIN_MESSAGES.ERROR.CATEGORY_NOT_FOUND },
      });
    }
  } catch (error) {
    console.error("Error while editing category:", error);
    return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      errors: { general: ADMIN_MESSAGES.ERROR.INTERNAL_SERVER_ERROR },
    });
  }
};

const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(HttpStatusCode.BAD_REQUEST)
        .json({ status: false, message: "Category not found" });
    }

    const products = await ProductV2.find({ category: categoryId });

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } },
    );

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      product.variants = product.variants.map((variant) => {
        let salePrice = variant.salePrice;
        const regularPrice = variant.regularPrice;

        if (product.productOffer > 0) {
          const productOfferPercentage = product.productOffer / 100;
          salePrice = Math.round(salePrice / (1 - productOfferPercentage));
        }

        if (percentage > 0) {
          const categoryOfferAmount = Math.round(
            salePrice * (percentage / 100),
          );
          salePrice -= categoryOfferAmount;
        }

        if (product.productOffer > 0) {
          const productOfferAmount = Math.round(
            salePrice * (product.productOffer / 100),
          );
          salePrice -= productOfferAmount;
        }

        if (salePrice > regularPrice) {
          salePrice = regularPrice;
        }

        return {
          ...variant,
          salePrice,
        };
      });

      await product.save();
    }

    res.json({ status: true, message: "Category offer applied successfully" });
  } catch (error) {
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({
        status: false,
        message: ADMIN_MESSAGES.ERROR.INTERNAL_SERVER_ERROR,
      });
    console.error("Error in addCategoryOffer:", error);
  }
};

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(HttpStatusCode.BAD_REQUEST)
        .json({ status: false, message: "Category not found" });
    }

    const percentage = category.categoryOffer;

    const products = await ProductV2.find({ category: categoryId });

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      product.variants = product.variants.map((variant) => {
        let salePrice = variant.salePrice;
        let originalPrice = salePrice;
        const regularPrice = variant.regularPrice;

        if (product.productOffer > 0) {
          const productOfferPercentage = product.productOffer / 100;
          originalPrice = Math.round(salePrice / (1 - productOfferPercentage));
        }

        if (percentage > 0) {
          salePrice = Math.round(originalPrice / (1 - percentage / 100));
        }

        if (product.productOffer > 0) {
          const productOfferAmount = Math.round(
            salePrice * (product.productOffer / 100),
          );
          salePrice -= productOfferAmount;
        }

        if (salePrice > regularPrice) {
          salePrice = regularPrice;
        }

        return {
          ...variant,
          salePrice,
        };
      });

      await product.save();
    }

    category.categoryOffer = 0;
    await category.save();

    res.json({ status: true, message: "Category offer removed successfully" });
  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({
        status: false,
        message: ADMIN_MESSAGES.ERROR.INTERNAL_SERVER_ERROR,
      });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  getEditCategory,
  editCategory,
  listCategory,
  unlistCategory,
  addCategoryOffer,
  removeCategoryOffer,
};
