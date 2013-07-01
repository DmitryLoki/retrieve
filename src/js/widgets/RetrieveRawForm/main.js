define(["utils","knockout"],function(utils,ko) {
	var RetrieveRawForm = function(options) {
		var self = this;
		this.server = options.server;
		this.form = {
			from: ko.observable(""),
			to: ko.observable("me"),
			body: ko.observable(""),
			sender: ko.observable("")
		}
		this.status = ko.observable("form");
		this.send = function() {
			self.status("sending");
			self.ajax = self.server.post({
				type: "sms",
				data: {
					from: self.form.from(),
					to: self.form.to(),
					body: self.form.body(),
					sender: self.form.sender()
				},
				callback: function(result) {
					if (result.success)
						self.status("success");
					if (result.error)
						self.status("error");
				}
			});
		}
		this.cancel = function() {
			if (self.ajax)
				self.ajax.abort();
			self.status("form");
		}
		this.onemore = function() {
			self.form.body("");
			self.status("form");
		}
	}

	RetrieveRawForm.prototype.templates = ["main"];

	return RetrieveRawForm;
});