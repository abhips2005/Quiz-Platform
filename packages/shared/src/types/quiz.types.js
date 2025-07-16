"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizStatus = exports.QuizVisibility = exports.DifficultyLevel = exports.QuestionType = void 0;
var QuestionType;
(function (QuestionType) {
    QuestionType["MULTIPLE_CHOICE"] = "MULTIPLE_CHOICE";
    QuestionType["CHECKBOX"] = "CHECKBOX";
    QuestionType["TRUE_FALSE"] = "TRUE_FALSE";
    QuestionType["SHORT_ANSWER"] = "SHORT_ANSWER";
    QuestionType["FILL_IN_BLANK"] = "FILL_IN_BLANK";
    QuestionType["MATCHING"] = "MATCHING";
    QuestionType["ORDERING"] = "ORDERING";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["EASY"] = "EASY";
    DifficultyLevel["MEDIUM"] = "MEDIUM";
    DifficultyLevel["HARD"] = "HARD";
})(DifficultyLevel || (exports.DifficultyLevel = DifficultyLevel = {}));
var QuizVisibility;
(function (QuizVisibility) {
    QuizVisibility["PUBLIC"] = "PUBLIC";
    QuizVisibility["PRIVATE"] = "PRIVATE";
    QuizVisibility["SCHOOL_ONLY"] = "SCHOOL_ONLY";
    QuizVisibility["CLASS_ONLY"] = "CLASS_ONLY";
})(QuizVisibility || (exports.QuizVisibility = QuizVisibility = {}));
var QuizStatus;
(function (QuizStatus) {
    QuizStatus["DRAFT"] = "DRAFT";
    QuizStatus["PUBLISHED"] = "PUBLISHED";
    QuizStatus["ARCHIVED"] = "ARCHIVED";
})(QuizStatus || (exports.QuizStatus = QuizStatus = {}));
//# sourceMappingURL=quiz.types.js.map