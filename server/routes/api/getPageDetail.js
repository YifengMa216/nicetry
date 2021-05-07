const Express = require("express");
const router = Express.Router();
const Page = require("../../models/page");
const Comment = require("../../models/comment");
const { responseClient } = require("../../util/tools");

router.get("/", (req, res) => {
    console.log("getPageDetail");

    let _id = req.query.id;
    Page.findOne({ _id })
        .then(async (data) => {
            // viewCount
            data.viewCount = data.viewCount + 1;

            // Comment
            await Comment.countDocuments({ entryID: _id }).then((result) => {
                console.log("count: " + result);
            });

            await Comment.find({ entryID: _id }).then((result) => {
                console.log("find: " + result);
                data.comments = result;
            });

            console.log(data.comments);

            console.log("data: " + data);

            Page.updateOne({ _id }, { viewCount: data.viewCount })
                .then((result) => {
                    responseClient(res, 200, 0, "success", data);
                })
                .cancel((err) => {
                    throw err;
                });
        })
        .cancel((err) => {
            responseClient(res);
        });
});

module.exports = router;
