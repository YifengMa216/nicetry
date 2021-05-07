const Express = require("express");
const router = Express.Router();
const User = require("../../models/user");
const { responseClient } = require("../../util/tools");

router.get("/", (req, res) => {
    console.log("getUsers");

    let skip = req.query.pageNum - 1 < 0 ? 0 : (req.query.pageNum - 1) * 10;

    let responseData = {
        total: 0,
        list: [],
    };

    User.countDocuments().then((count) => {
        responseData.total = count;
        User.find(null, "_id username type password", { skip: skip, limit: 10 })
            .then((result) => {
                responseData.list = result;
                responseClient(res, 200, 0, "", responseData);
            })
            .catch((err) => {
                responseClient(res);
            });
    });
});

module.exports = router;
