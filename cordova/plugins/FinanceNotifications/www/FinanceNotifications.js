var exec = require("cordova/exec");

var FinanceNotifications = {
  requestPermission: function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "FinanceNotifications", "requestPermission", []);
  },

  createChannel: function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "FinanceNotifications", "createChannel", []);
  },

  schedule: function(id, title, message, triggerAtMillis, successCallback, errorCallback) {
    exec(successCallback, errorCallback, "FinanceNotifications", "schedule", [id, title, message, triggerAtMillis]);
  },

  cancel: function(id, successCallback, errorCallback) {
    exec(successCallback, errorCallback, "FinanceNotifications", "cancel", [id]);
  },

  cancelAll: function(successCallback, errorCallback) {
    exec(successCallback, errorCallback, "FinanceNotifications", "cancelAll", []);
  }
};

module.exports = FinanceNotifications;
