const Express = require("express");
const router = Express.Router();
const Page = require("../../models/page");
const { responseClient } = require("../../util/tools");

router.post("/addPage", function (req, res) {
    const { title, content, tags, author } = req.body;

    console.log("addPage");
    console.log(title, content, tags, author);

    // const author = req.session.userInfo.username;
    const viewCount = 0;
    // 1 默认可见
    const status = 1;

    let newPage = new Page({
        title,
        content,
        viewCount,
        author,
        tags,
        status,
    });

    newPage
        .save()
        .then((data) => {
            responseClient(res, 200, 0, "保存成功", data);
        })
        .cancel((err) => {
            console.log(err);
            responseClient(res);
        });
});

router.post("/updatePage", (req, res) => {
    const { title, content, tags, id } = req.body;

    console.log("updatePage");
    console.log(title, content, tags);

    Page.updateOne({ _id: id }, { title, content, tags })
        .then((result) => {
            console.log(result);
            responseClient(res, 200, 0, "更新成功", result);
        })
        .cancel((err) => {
            console.log(err);
            responseClient(res);
        });
});

router.post("/delPage", (req, res) => {
    const { id } = req.body;

    console.log("delPage");

    Page.remove({ _id: id })
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

module.exports = router;
