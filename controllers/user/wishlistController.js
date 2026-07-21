const User = require("../../models/userSchema");
const ProductV2 = require("../../models/productsSchemaV2");
const Wishlist = require("../../models/wishlistSchema");
const { HttpStatusCode } = require("../../constents/httpStatusCodes");
const { USER_MESSAGES } = require("../../constents/userMessages");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    let wishlist = await Wishlist.findOne({ userId }).populate({
      path: "items.productId",
      model: "ProductV2",
    });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: userId,
        items: [],
      });
      await wishlist.save();
      await User.findByIdAndUpdate(userId, {
        $push: { wishlist: wishlist._id },
      });
    }

    let totalWishlistPrice = 0;

    const wishlistItems = await Promise.all(
      wishlist.items.map(async (item) => {
        const product = await ProductV2.findById(item.productId);

        if (!product || !product.variants[item.variantIndex]) {
          return null;
        }

        const variant = product.variants[item.variantIndex];
        const salePrice = variant.salePrice;

        totalWishlistPrice += salePrice;

        return {
          user: userData,
          productId: product._id,
          variantId: item.variantIndex,
          name: product.productName,
          image: variant.images[0] || "/img/no-image.png",
          price: variant.salePrice,
          color: variant.color || "NA",
          size: variant.size || "NA",
          quantity: 1,
          regularPrice: variant.regularPrice,
          total: salePrice,
        };
      }),
    );

    const cartItemCount = req.session.cartItemCount || 0;

    res.render("wishlist", {
      wishlistItems: wishlistItems.filter((item) => item !== null),
      user: userData,
      cartItemCount,
      total: totalWishlistPrice,
    });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send(USER_MESSAGES.WISHLIST.ERROR.INTERNAL_SERVER_ERROR);
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantIndex } = req.body;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId: userId,
        items: [],
      });
      await wishlist.save();
      await User.findByIdAndUpdate(userId, {
        $push: { wishlist: wishlist._id },
      });
    }
    const itemExists = wishlist.items.some(
      (item) =>
        item.productId.toString() === productId.toString() &&
        item.variantIndex === variantIndex,
    );

    if (itemExists) {
      return res.json({
        success: true,
        message: USER_MESSAGES.WISHLIST.SUCCESS.ITEM_ALREADY_EXISTS,
      });
    }

    wishlist.items.push({ productId, variantIndex, addedOn: Date.now() });

    await wishlist.save();

    res.json({
      success: true,
      message: USER_MESSAGES.WISHLIST.SUCCESS.ITEM_ADDED,
    });
  } catch (error) {
    console.error("Error adding item to wishlist:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: USER_MESSAGES.WISHLIST.ERROR.INTERNAL_SERVER_ERROR,
      });
  }
};

removeProductFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.session.user;

    const updatedWishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true },
    ).populate("items.productId");

    if (!updatedWishlist) {
      return res
        .status(HttpStatusCode.NOT_FOUND)
        .json({ message: USER_MESSAGES.WISHLIST.ERROR.WISHLIST_NOT_FOUND });
    }

    const wishlistItemCount = updatedWishlist.items.length;
    req.session.wishlistItemCount = wishlistItemCount;

    return res.status(HttpStatusCode.OK).json({
      message: USER_MESSAGES.WISHLIST.SUCCESS.ITEM_REMOVED,
      wishlist: updatedWishlist,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .json({ error: USER_MESSAGES.WISHLIST.ERROR.REMOVE_ITEM_FAILED });
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeProductFromWishlist,
};
