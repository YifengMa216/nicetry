const Express = require("express");
const router = Express.Router();
const Page = require("../../models/page");
const Comment = require("../../models/comment");
const { responseClient } = require("../../util/tools");

router.get("/", function (req, res) {
    console.log("getPages");

    // console.log(req);
    let searchV = req.query.searchV || null;
    console.log("searchV:", searchV);

    let tag = req.query.tag || null;

    let status = req.query.status;
    status = 1;

    let searchCondition = {
        status,
    };

    if (tag) {
        searchCondition.tags = tag;
    }

    tag = {};

    if (searchV) {
        let regexp = new RegExp(searchV, "i");

        searchCondition.$or = [
            { title: { $regex: regexp } },
            { content: { $regex: regexp } },
            { author: { $regex: regexp } },
        ];
    }

    console.log(searchCondition);

    let skip = req.query.pageNum - 1 < 0 ? 0 : (req.query.pageNum - 1) * 10;

    let responseData = {
        total: 0,
        list: [],
    };

    Page.countDocuments(searchCondition)
        .then((count) => {
            // console.log(count);

            responseData.total = count;
            Page.find(
                searchCondition,
                {
                    _id: 1,
                    title: 1,
                    viewCount: 1,
                    author: 1,
                    tags: 1,
                    status: 1,
                    comments: 1,
                },
                {
                    skip: skip,
                    limit: 10,
                }
            )
                .then(async (result) => {
                    // const comments = commentData =  Comment.countDocuments({
                    //     entryID: v._id,
                    // });

                    const pages = [];

                    for (let i = 0; i < result.length; ++i) {
                        const pageItem = result[i].toObject();
                        // console.log("result", result[i].toObject());

                        const commentCount = await Comment.countDocuments({
                            entryID: pageItem._id,
                        });
                        const pageData = { ...pageItem, commentCount };

                        pages.push(pageData);
                    }
                    // console.log("pages", pages);

                    responseData.list = pages;
                    responseClient(res, 200, 0, "success", responseData);
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
