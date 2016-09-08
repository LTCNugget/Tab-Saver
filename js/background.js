// js/background.js
//var chrome; // for jshint

var allTabs = {  },
		workTree = {  };

// constructor Workspace(String name[, object info = { array of Tabs tabs, string parent }])
function Workspace(name, info) {
	this.launched = false;
	this.name = name;
	this.launchId = 0;
	this.tabs = [  ];
	if(info.tabs) {
		for(var i = 0; i < info.tabs.length; i++) {
			this.tabs.push(info.tabs[i]);
		}
	}
	if(info.parent) {
		this.parent = info.parent;
	} else {
		this.parent = "workTree";
	}

	this.save = function() {
		var self = this;
		chrome.storage.sync.set({
			[this.parent]: {
				[this.name]: this
			}
		}, function() {
			if (!chrome.runtime.lastError) {
				console.log(self.name + " successfully synced");
			} else {
				console.error(self.name + " did not sync: " + chrome.runtime.lastError.message);
			}
		});
	};

	// launch(object info = { [boolean incognito] })
	this.launch = function(info) {
		if(!this.launched) {
			this.launched = true;
			var launchInfo = {
				url: [  ],
				incognito: info.incognito
			};
			for(var i in this.tabs) {
				launchInfo.url.push(this.tabs[i].url);
			}
			var self = this;
			chrome.windows.create(launchInfo, function(windowCreated) {
				console.log(self.name + " has been launched");
				self.launchId = windowCreated.id;
				chrome.windows.onRemoved.addListener(function wOnRemWatch(windowRemovedId) {
					chrome.windows.onRemoved.removeListener(wOnRemWatch);
					if(windowRemovedId === self.launchId) {
						self.unLaunch();
					}
				});
				return true;
			});
		} else {
			console.warn(this.name + " is already launched");
			return false;
		}
	};

	this.unLaunch = function() {
		this.launchId = 0;
		this.launched = false;
		return !this.launched && this.launchId === 0;
	};

	// addTab(Tab tab)
	this.addTab = function(tab) {
		this.tabs.push(tab);
		return true;
	};
}

//----- Functions -------------------------------------------------------------

// clearStorage(boolean confirm)
function clearStorage(confirm) {
	if(confirm) {
		chrome.storage.sync.clear(function() {
			if(!chrome.runtime.lastError) {
				console.log("Storage cleared");
			} else {
				console.error("Storage was not cleared: " + chrome.runtime.lastError.message);
			}
		});
	}
}

// updateWindow(int windowId)
function updateWindow(windowId) {
	//var perfA = performance.now();
//	if(allTabs[windowId]) {
		chrome.windows.get(windowId, { populate: true }, function(windowGot) {
			if(windowGot !== undefined) {
				allTabs[windowId] = windowGot;
			} else {
				delete allTabs[windowId];
			}
			if(chrome.runtime.lastError) {
				console.error("Could not get window: " + chrome.runtime.lastError.message);
				return false;
			}
		});
//	} else {
//		delete allTabs[windowId];
//	}
	//var perfFin = performance.now() - perfA;
	//console.log("It took " + perfFin + " ms to updateWindow");
	return true;
}

// updateTab(int tabId)
function updateTab(tabId) {
	//var perfA = performance.now();
	chrome.tabs.get(tabId, function(tabUpdated) {
		if(!chrome.runtime.lastError) {
			allTabs[tabUpdated.windowId].tabs[tabUpdated.index] = tabUpdated;
		} else {
			console.error("Could not get tab: " + chrome.runtime.lastError.message);
			return false;
		}
	});
	//var perfFin = performance.now() - perfA;
	//console.log("It took " + perfFin + " ms to updateTab");
	return true;
}

//----- Start Functions -------------------------------------------------------

chrome.storage.sync.get("workTree", function(items) {
	//workTree = items.workTree;
	if(!chrome.runtime.lastError) {
		console.log("Got workTree from storage");
	} else {
		console.error("Could not get sync storage: " + chrome.runtime.lastError.message);
	}
	chrome.storage.sync.getBytesInUse(null, function(bytesInUse) {
		if(!chrome.runtime.lastError) {
			console.log(bytesInUse + " bytes are being used");
		} else {
			console.error("Could not get bytes in use: " + chrome.runtime.lastError.message);
		}
	});
});

chrome.windows.getAll({ populate: true }, function(windows) {
	for(var i in windows) {
		allTabs[windows[i].id] = windows[i];
	}
});

//----- chrome.windows Listeners ----------------------------------------------

chrome.windows.onCreated.addListener(function wOnCre(windowCreated) {
	allTabs[windowCreated.id] = windowCreated;
	allTabs[windowCreated.id].tabs = [  ];
	chrome.tabs.query({ windowId: windowCreated.id }, function(tabs) {
		for(var i in tabs) {
			allTabs[windowCreated.id].tabs[tabs[i].index] = tabs[i];
		}
	});
});

chrome.windows.onRemoved.addListener(function wOnRem(windowRemovedId) {
	delete allTabs[windowRemovedId];
});

//----- chrome.tabs Listeners -------------------------------------------------

chrome.tabs.onCreated.addListener(function tOnCre(tabCreated) {
	updateWindow(tabCreated.windowId);
});

chrome.tabs.onUpdated.addListener(function tOnUpd(tabUpdatedId) {
	updateTab(tabUpdatedId);
});

chrome.tabs.onMoved.addListener(function tOnMov(tabMovedId, tabMovedInfo) {
	updateWindow(tabMovedInfo.windowId);
});

chrome.tabs.onAttached.addListener(function tOnAtt(tabAttachedId, tabAttachedInfo) {
	updateWindow(tabAttachedInfo.newWindowId);
});

chrome.tabs.onDetached.addListener(function tOnDet(tabDetachedId, tabDetachedInfo) {
	updateWindow(tabDetachedInfo.oldWindowId);
});

chrome.tabs.onRemoved.addListener(function tOnRem(tabRemovedId, tabRemovedInfo) {
	updateWindow(tabRemovedInfo.windowId);
});

//----- Testing ---------------------------------------------------------------

workTree.workspace1 = new Workspace("Workspace 1", {
	tabs: [
		{ url: "https://google.com/" },
		{ url: "https://github.com/" }
	]
});

chrome.tabs.create({
	url: "html/popup.html"
});