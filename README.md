a proxy server to load the entire web page including lazy loaded part

phomtonjs API:

All:
	https://github.com/ariya/phantomjs/wiki/API-Reference

Module WebPage:
	https://github.com/ariya/phantomjs/wiki/API-Reference-WebPage

	main api:
		Properties list
			clipRect canGoBack canGoForward content cookies customHeaders event focusedFrameName frameContent frameName framePlainText frameTitle frameUrl framesCount 				framesName libraryPath navigationLocked offlineStoragePath offlineStorageQuota ownsPages pages pagesWindowName paperSize plainText scrollPosition settings title 				url viewportSize windowName zoomFactor
		Functions list
			addCookie() childFramesCount() childFramesName() clearCookies() close() currentFrameName() deleteCookie() evaluateJavaScript() evaluate() evaluateAsync() 
			getPage() go() goBack() goForward() includeJs() injectJs() open() openUrl() release() reload() render() renderBase64() sendEvent() setContent() stop() 				switchToFocusedFrame() switchToFrame() switchToChildFrame() switchToMainFrame() switchToParentFrame() uploadFile()
		Callbacks list
			onAlert onCallback onClosing onConfirm onConsoleMessage onError onFilePicker onInitialized onLoadFinished onLoadStarted onNavigationRequested onPageCreated 				onPrompt onResourceRequested onResourceReceived onResourceTimeout onResourceError onUrlChanged

Module WebServer:
	https://github.com/ariya/phantomjs/wiki/API-Reference-WebServer

	main api:
		server
		request
		response

