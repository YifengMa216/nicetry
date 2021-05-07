import { fork } from "redux-saga/effects";
import { loginFlow, registerFlow, user_auth } from "./homeSaga";
import { getAllUsersFlow } from "./admin/managerUsersSaga";
import {
    getAllTagsFlow,
    addTagFlow,
    delTagFlow,
} from "./admin/managerTagsSaga";
import { savePageFlow } from "./admin/managerNewPageSaga";
import {
    getPageFlow,
    deletePageFlow,
    editPageFlow,
} from "./admin/managerPageSaga";
import {
    getPagesListFlow,
    getPageDetailFlow,
    addCommentFlow,
} from "./frontSaga";

export default function* rootSaga() {
    yield fork(loginFlow);
    yield fork(registerFlow);
    yield fork(user_auth);
    yield fork(getAllUsersFlow);
    yield fork(getAllTagsFlow);
    yield fork(addTagFlow);
    yield fork(delTagFlow);
    yield fork(savePageFlow);
    yield fork(getPageFlow);
    yield fork(deletePageFlow);
    yield fork(getPagesListFlow);
    yield fork(getPageDetailFlow);
    yield fork(editPageFlow);
    yield fork(addCommentFlow);
}
