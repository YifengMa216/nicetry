const dbmanager = require("./db.js");

module.exports = dbmanager.register(
    {
        name: String,
    },
    "Tag",
    "tags"
);
