const Express = require("express");
const router = Express.Router();
const Comment = require("../../models/comment");
const { responseClient } = require("../../util/tools");

router.post("/addComment", function (req, res) {
    const { entryID, content, author } = req.body;

    console.log("addComment");
    console.log(entryID, content, author);

    const like = 0;
    const unlike = 0;

    let newComment = new Comment({
        entryID,
        content,
        author,
        like,
        unlike,
    });

    newComment
        .save()
        .then((data) => {
            responseClient(res, 200, 0, "保存成功", data);
        })
        .cancel((err) => {
            console.log(err);
            responseClient(res);
        });
});

router.post("/delComment", (req, res) => {
    const { id } = req.body;

    console.log("delComment");

    Comment.remove({ _id: id })
        .then((result) => {
            console.log(result);

            if (result.n === 1) {
                responseClient(res, 200, 0, "删除");
            } else {
                responseClient(res, 200, 1, "未找到");
            }
        })
        .cancel((err) => {
            responseClient(res);
        });
});

router.post("/like", (req, res) => {
    const { id } = req.body;

    console.log("like");

    Comment.findOne({ _id: id }, function (err, data) {
        console.log(data);
        let { like } = data;

        console.log("like: " + like);

        Comment.updateOne({ _id: id }, { like: like + 1 })
            .then((result) => {
                console.log(result);
                responseClient(res, 200, 0, "更新成功", result);
            })
            .cancel((err) => {
                console.log(err);
                responseClient(res);
            });
    });
});

router.post("/unlike", (req, res) => {
    const { id } = req.body;

    console.log("unlike");

    Comment.findOne({ _id: id }, function (err, data) {
        console.log(data);
        let { unlike } = data;

        console.log("unlike: " + unlike);

        Comment.updateOne({ _id: id }, { unlike: unlike + 1 })
            .then((result) => {
                console.log(result);
                responseClient(res, 200, 0, "更新成功", result);
            })
            .cancel((err) => {
                console.log(err);
                responseClient(res);
            });
    });
});

module.exports = router;
