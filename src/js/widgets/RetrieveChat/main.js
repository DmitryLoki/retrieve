define(["jquery","knockout","config","jquery.tinyscrollbar"], function($,ko,config) {
	var RetrieveChat = function(options) {
		var self = this;

		this.server = options.server;
		this.ufo = options.ufo;
		this.smsData = options.smsData;
		this.inModalWindow = ko.observable(false);

		this.chatData = ko.observableArray([]);
		this.chatDataInitializer = ko.computed(function() {
			if (!self.ufo()) return null;
			if (self.inModalWindow()) self.modalWindow.title("Chat with " + self.ufo().name());
			var sms2add = [];
			self.smsData().forEach(function(sms) {
				if (sms.target == self.ufo().personId())
					sms2add.push(sms);
			});
			self.chatData(sms2add);
			self.updateScrollbar(false, true);
			return null;
		});

		this.form = {
			loading: ko.observable(false),
			text: ko.observable(""),
			send: function() {
				self.form.loading(true);
				self.form.ajax = self.server.post({
					type: "sms",
					data: {
						from: "me",
						to: self.ufo().personId(),
						body: self.form.text(),
						sender: ""
					},
					callback: function(result) {
						self.form.loading(false);
						self.form.text("");
						if (result.error)
							alert("Failed sending message");
						self.emit("newMessage");
					}
				});
			},
			cancel: function() {
				if (self.form.ajax)
					self.ajax.abort();
				self.form.loading(false);
			}
		}
	}

	RetrieveChat.prototype.updateScrollbar = function(it, scrollToBottom) {
		var self = this;
		if (this.scrollbarContainer)
			this.scrollbarContainer.tinyscrollbar_update(scrollToBottom?'bottom':'');
		if (!it) setTimeout(function() {
			self.updateScrollbar(1,scrollToBottom);
		},100);
	}

	RetrieveChat.prototype.domInit = function(element, params) {
		var self = this;
		this.modalWindow = params.modalWindow;
		if (this.modalWindow) {
			this.inModalWindow(true);
			this.modalWindow.on("close",function() {
				self.ufo(null);
			});
			this.modalWindow.on("resize",function() {
				self.updateScrollbar();
			});
      this.modalWindow.on("open",function() {
        self.updateScrollbar(false, true);
      })
		}
		var div = ko.virtualElements.firstChild(element);
		while (div && div.nodeType != 1)
			div = ko.virtualElements.nextSibling(div);
		this.container = $(div);
		this.scrollbarContainer = this.container.find(".airvis-scrollbar").tinyscrollbar();
		this.updateScrollbar();
	};

	RetrieveChat.prototype.templates = ["main"];

	return RetrieveChat;
});