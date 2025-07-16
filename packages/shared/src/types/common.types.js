"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMEZONES = exports.COUNTRIES = exports.GRADES = exports.SUBJECTS = exports.NotificationType = void 0;
var NotificationType;
(function (NotificationType) {
    NotificationType["GAME_INVITATION"] = "GAME_INVITATION";
    NotificationType["ASSIGNMENT_DUE"] = "ASSIGNMENT_DUE";
    NotificationType["QUIZ_SHARED"] = "QUIZ_SHARED";
    NotificationType["ACHIEVEMENT_EARNED"] = "ACHIEVEMENT_EARNED";
    NotificationType["GAME_STARTED"] = "GAME_STARTED";
    NotificationType["RESULTS_AVAILABLE"] = "RESULTS_AVAILABLE";
    NotificationType["SYSTEM_UPDATE"] = "SYSTEM_UPDATE";
    NotificationType["WELCOME"] = "WELCOME";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Constants
exports.SUBJECTS = [
    'Mathematics',
    'Science',
    'English',
    'History',
    'Geography',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Art',
    'Music',
    'Physical Education',
    'Foreign Language',
    'Social Studies',
    'Other'
];
exports.GRADES = [
    'Kindergarten',
    '1st Grade',
    '2nd Grade',
    '3rd Grade',
    '4th Grade',
    '5th Grade',
    '6th Grade',
    '7th Grade',
    '8th Grade',
    '9th Grade',
    '10th Grade',
    '11th Grade',
    '12th Grade',
    'University',
    'Adult'
];
exports.COUNTRIES = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Spain',
    'Italy',
    'Japan',
    'South Korea',
    'China',
    'India',
    'Brazil',
    'Mexico',
    'Other'
];
exports.TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland'
];
//# sourceMappingURL=common.types.js.map