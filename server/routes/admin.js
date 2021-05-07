const Express = require("express");
const router = Express.Router();

router.use("/tags", require("./admin/tags"));
router.use("/page", require("./admin/page"));
router.use("/comment", require("./admin/comment"));

module.exports = router;
