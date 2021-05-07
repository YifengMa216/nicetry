const Express = require("express");
const router = Express.Router();
const Tag = require("../../models/tag");
const { responseClient } = require("../../util/tools");

router.get("/", function (req, res) {
    console.log("getTags");

    Tag.find(null, "name")
        .then((data) => {
            responseClient(res, 200, 0, "请求成功", data);
        })
        .catch((err) => {
            responseClient(res);
        });
});

module.exports = router;
