Template.newevent.helpers({
 showCreateDialog: function () {
     return Session.get("showCreateDialog");
 },
 createCoords: function () {
     return Session.get("createCoords");
 }
});