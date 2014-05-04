Satellite is a phantomjs based program to scraping web page with even ajax content. Satellite is designed as a proxy server which can be a front end of other spider systems such as nutch.

To start satellite as a proxy server, just click : 
start-satellite.bat

If you are using a family network, and want to be accessed from outside your router, you may need to correctly config your router to allow your PC serve as a DMZ host.
如果使用家庭网络，需要从外部访问satellite，需要通过配置路由器，将运行satellite的PC配置成为DMZ主机。
This feature is be improved later.

-----------------------------------------------------------
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

