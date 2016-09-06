// js/background.js

var allTabs = {  },
		workTree = {  };

// constructor Workspace(String name[, object info = { array tabs, string parent }])
function Workspace(name, info) {
	this.launched = false;
	this.name = name;
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

	this.updateTab = function(tabId) {
		chrome.tabs.get(tabId, function(gotTab) {
			for(var i in this.tabs) {
				if(this.tabs[i].id === tabId) {
					this.tabs[i] = gotTab;
				}
			}
		});
	};

	this.save = function() {
		chrome.storage.sync.set({
			[this.parent]: {
				[this.name]: this
			}
		}, function() {
			if (!chrome.runtime.lastError) {
				console.log(this.name + " successfully synced");
			} else {
				console.error(this.name + " did not sync");
				console.log(chrome.runtime.lastError.message);
			}
		});
	};

	// launch(object info)
	this.launch = function(info) {
		if(!this.launched) {
			launchInfo = {
				url: [  ],
				incognito: info.incognito
			};
			for(var i in this.tabs) {
				launchInfo.url.push(this.tabs[i].url);
			}
			chrome.windows.create(launchInfo, function() {
				console.log(this.name + " has been launched");
			});
		} else {
			console.warn(this.name + " is already launched");
		}
	};

	// addTab(Tab tab)
	this.addTab = function(tab) {
		this.tabs.push(tab);
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
				console.error("Storage was not cleared");
				console.log(chrome.runtime.lastError.message);
			}
		});
	}
}

// updateWindow(int windowId)
function updateWindow(windowId) {
	var perfA = performance.now();
	if(allTabs[windowId]) {
		chrome.windows.get(windowId, { populate: true }, function(windowGot) {
			allTabs[windowId] = windowGot;
		});
	} else {
		delete allTabs[windowId];
	}
	perfFin = performance.now() - perfA;
	console.log("It took " + perfFin + " ms to updateWindow");
}

// updateTab(int tabId)
function updateTab(tabId) {
	var perfA = performance.now();
	chrome.tabs.get(tabId, function(tabUpdated) {
		allTabs[tabUpdated.windowId].tabs[tabUpdated.index] = tabUpdated;
	});
	perfFin = performance.now() - perfA;
	console.log("It took " + perfFin + " ms to updateTab");
}

//----- Start Functions -------------------------------------------------------

chrome.storage.sync.get("workTree", function(items) {
	workTree = items.workTree;
	if(!chrome.runtime.lastError) {
		console.log("Got workTree from storage");
	} else {
		console.error("Could not get sync storage");
		console.log(chrome.runtime.lastError.message);
	}
	chrome.storage.sync.getBytesInUse(null, function(bytesInUse) {
		if(!chrome.runtime.lastError) {
			console.log(bytesInUse + " bytes are being used");
		} else {
			console.error("Could not get bytes in use");
			console.log(chrome.runtime.lastError.message);
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