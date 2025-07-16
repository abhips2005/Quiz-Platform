"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEventType = exports.PowerUpType = exports.PlayerStatus = exports.GameStatus = exports.GameMode = void 0;
var GameMode;
(function (GameMode) {
    GameMode["LIVE"] = "LIVE";
    GameMode["HOMEWORK"] = "HOMEWORK";
    GameMode["PRACTICE"] = "PRACTICE";
    GameMode["TOURNAMENT"] = "TOURNAMENT"; // Competitive tournament
})(GameMode || (exports.GameMode = GameMode = {}));
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "WAITING";
    GameStatus["STARTING"] = "STARTING";
    GameStatus["IN_PROGRESS"] = "IN_PROGRESS";
    GameStatus["PAUSED"] = "PAUSED";
    GameStatus["FINISHED"] = "FINISHED";
    GameStatus["CANCELLED"] = "CANCELLED";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["JOINED"] = "JOINED";
    PlayerStatus["READY"] = "READY";
    PlayerStatus["PLAYING"] = "PLAYING";
    PlayerStatus["FINISHED"] = "FINISHED";
    PlayerStatus["DISCONNECTED"] = "DISCONNECTED";
    PlayerStatus["KICKED"] = "KICKED";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
var PowerUpType;
(function (PowerUpType) {
    PowerUpType["FIFTY_FIFTY"] = "50_50";
    PowerUpType["TIME_FREEZE"] = "TIME_FREEZE";
    PowerUpType["DOUBLE_POINTS"] = "DOUBLE_POINTS";
    PowerUpType["SKIP_QUESTION"] = "SKIP_QUESTION";
    PowerUpType["REVEAL_ANSWER"] = "REVEAL_ANSWER";
    PowerUpType["EXTRA_TIME"] = "EXTRA_TIME";
    PowerUpType["STREAK_SAVER"] = "STREAK_SAVER";
    PowerUpType["POINT_STEALER"] = "POINT_STEALER"; // Steal points from leader
})(PowerUpType || (exports.PowerUpType = PowerUpType = {}));
var GameEventType;
(function (GameEventType) {
    GameEventType["PLAYER_JOINED"] = "PLAYER_JOINED";
    GameEventType["PLAYER_LEFT"] = "PLAYER_LEFT";
    GameEventType["PLAYER_READY"] = "PLAYER_READY";
    GameEventType["GAME_STARTED"] = "GAME_STARTED";
    GameEventType["QUESTION_STARTED"] = "QUESTION_STARTED";
    GameEventType["QUESTION_ENDED"] = "QUESTION_ENDED";
    GameEventType["TIMER_UPDATE"] = "TIMER_UPDATE";
    GameEventType["TIMER_WARNING"] = "TIMER_WARNING";
    GameEventType["ANSWER_SUBMITTED"] = "ANSWER_SUBMITTED";
    GameEventType["POWER_UP_USED"] = "POWER_UP_USED";
    GameEventType["LEADERBOARD_UPDATED"] = "LEADERBOARD_UPDATED";
    GameEventType["SCORE_UPDATE"] = "SCORE_UPDATE";
    GameEventType["STREAK_UPDATE"] = "STREAK_UPDATE";
    GameEventType["GAME_PAUSED"] = "GAME_PAUSED";
    GameEventType["GAME_RESUMED"] = "GAME_RESUMED";
    GameEventType["GAME_ENDED"] = "GAME_ENDED";
    GameEventType["CHAT_MESSAGE"] = "CHAT_MESSAGE";
    GameEventType["HOST_MESSAGE"] = "HOST_MESSAGE";
})(GameEventType || (exports.GameEventType = GameEventType = {}));
//# sourceMappingURL=game.types.js.map