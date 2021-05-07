const Express = require("express");
const router = Express.Router();

router.use("/getUsers", require("./api/getUsers"));
router.use("/getTags", require("./api/getTags"));
router.use("/getPages", require("./api/getPages"));
router.use("/searchPages", require("./api/searchPages"));
router.use("/getPageDetail", require("./api/getPageDetail"));
// router.use("/getComment", require("./api/getComment"));
router.use("/user", require("./api/user"));

module.exports = router;
