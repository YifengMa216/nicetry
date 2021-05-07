const dbmanager = require("./db.js");

module.exports = dbmanager.register(
    {
        title: String,
        content: String,
        viewCount: Number,
        author: String,
        tags: Array,
        status: Number,
        comments: Array,
    },
    "Entry",
    "entrys"
);
