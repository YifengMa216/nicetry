import { take, put, call } from "redux-saga/effects";
import { get, post } from "../fetch/fetch";
import { actionsTypes as IndexActionTypes } from "../reducers";
import { actionTypes as FrontActionTypes } from "../reducers/frontReducer";

export function* getArticleList(tag, pageNum, searchV) {
    yield put({ type: IndexActionTypes.FETCH_START });
    try {
        return yield call(
            get,
            `/getPages?pageNum=${pageNum}&tag=${tag}&searchV=${searchV}`
        );
    } catch (err) {
        yield put({
            type: IndexActionTypes.SET_MESSAGE,
            msgContent: "网络请求错误",
            msgType: 0,
        });
    } finally {
        yield put({ type: IndexActionTypes.FETCH_END });
    }
}

export function* getPagesListFlow() {
    while (true) {
        let req = yield take(FrontActionTypes.GET_ARTICLE_LIST);
        console.log(req);
        let res = yield call(getArticleList, req.tag, req.pageNum, req.searchV);
        if (res) {
            if (res.code === 0) {
                res.data.pageNum = req.pageNum;
                yield put({
                    type: FrontActionTypes.RESPONSE_ARTICLE_LIST,
                    data: res.data,
                });
            } else {
                yield put({
                    type: IndexActionTypes.SET_MESSAGE,
                    msgContent: res.message,
                    msgType: 0,
                });
            }
        }
    }
}

export function* getArticleDetail(id) {
    yield put({ type: IndexActionTypes.FETCH_START });
    try {
        return yield call(get, `/getPageDetail?id=${id}`);
    } catch (err) {
        yield put({
            type: IndexActionTypes.SET_MESSAGE,
            msgContent: "getPageDetail网络请求错误",
            msgType: 0,
        });
    } finally {
        yield put({ type: IndexActionTypes.FETCH_END });
    }
}

export function* getPageDetailFlow() {
    while (true) {
        let req = yield take(FrontActionTypes.GET_ARTICLE_DETAIL);
        let res = yield call(getArticleDetail, req.id);
        if (res) {
            if (res.code === 0) {
                console.log(res.data);

                yield put({
                    type: FrontActionTypes.RESPONSE_ARTICLE_DETAIL,
                    data: res.data,
                });
            } else {
                yield put({
                    type: IndexActionTypes.SET_MESSAGE,
                    msgContent: res.message,
                    msgType: 0,
                });
            }
        }
    }
}

export function* addComment(entryID, comment, author) {
    yield put({ type: IndexActionTypes.FETCH_START });
    try {
        console.log("addComment");
        console.log(entryID, comment, author);

        return yield call(post, "/admin/comment/addComment", {
            entryID,
            content: comment,
            author,
        });
    } catch (err) {
        yield put({
            type: IndexActionTypes.SET_MESSAGE,
            msgContent: "addComment网络请求错误",
            msgType: 0,
        });
    } finally {
        yield put({ type: IndexActionTypes.FETCH_END });
    }
}

export function* addCommentFlow() {
    while (true) {
        console.log("addCommentFlow");

        let req = yield take(FrontActionTypes.ADD_COMMENT);
        let res = yield call(addComment, req.entryID, req.comment, req.author);
        if (res) {
            if (res.code === 0) {
                console.log(res.data);

                // yield put({
                //     type: FrontActionTypes.RESPONSE_ARTICLE_DETAIL,
                //     data: res.data,
                // });
                yield put({
                    type: IndexActionTypes.SET_MESSAGE,
                    msgContent: "评论成功",
                    msgType: 1,
                });
            } else {
                yield put({
                    type: IndexActionTypes.SET_MESSAGE,
                    msgContent: res.message,
                    msgType: 0,
                });
            }
        }
    }
}
