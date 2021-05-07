const initialState = {
    category: [],
    articleList: [],
    articleDetail: {},
    pageNum: 1,
    total: 0,
};
export const actionTypes = {
    GET_ARTICLE_LIST: "GET_ARTICLE_LIST",
    RESPONSE_ARTICLE_LIST: "RESPONSE_ARTICLE_LIST",
    GET_ARTICLE_DETAIL: "GET_ARTICLE_DETAIL",
    RESPONSE_ARTICLE_DETAIL: "RESPONSE_ARTICLE_DETAIL",
    ADD_COMMENT: "ADD_COMMENT",
};

export const actions = {
    get_article_list: function (tag = "", pageNum = 1, searchV = "") {
        return {
            type: actionTypes.GET_ARTICLE_LIST,
            tag,
            pageNum,
            searchV,
        };
    },
    get_article_detail: function (id) {
        return {
            type: actionTypes.GET_ARTICLE_DETAIL,
            id,
        };
    },
    add_comment: function (entryID, comment, author) {
        console.log("add_comment action");
        return {
            type: actionTypes.ADD_COMMENT,
            entryID,
            comment,
            author,
        };
    },
};

export function reducer(state = initialState, action) {
    switch (action.type) {
        case actionTypes.RESPONSE_ARTICLE_LIST:
            return {
                ...state,
                articleList: [...action.data.list],
                pageNum: action.data.pageNum,
                total: action.data.total,
            };
        case actionTypes.RESPONSE_ARTICLE_DETAIL:
            return {
                ...state,
                articleDetail: action.data,
            };

        default:
            return state;
    }
}
