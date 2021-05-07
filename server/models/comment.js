const dbmanager = require("./db.js");

module.exports = dbmanager.register(
    {
        entryID: String,
        content: String,
        author: String,
        like: Number,
        unlike: Number,
    },
    "Comment",
    "comments"
);
