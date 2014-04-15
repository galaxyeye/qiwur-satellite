var logger = require('./logger');
var DefaultTimerInterval = 250;

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 * 
 * @param testFx
 *            javascript condition that evaluates to a boolean, it can be passed
 *            in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or as
 *            a callback function.
 * @param onReady
 *            what to do when testFx condition is fulfilled, it can be passed in
 *            as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or as a
 *            callback function.
 * @param timeOutMillis
 *            the max amount of time to wait. If not specified, 3 sec is used.
 */
function WaitFor(testFx, onReady, onTimeout, timeOutMillis) {
	this.testFx = testFx;
	this.onReady = onReady;
	this.onTimeout = onTimeout;
	// default timeout limit is 3s
	this.timeOutMillis = timeOutMillis ? timeOutMillis : 3000;

	this.start  = new Date().getTime();
	this.started = false;
	this.condition = false;
	this.timeout = false;
};

WaitFor.prototype.timerFn = function() {
	var tick = 0;

	if (++tick % 5 == 0) {
		// logger.debug('tick : ' + tick);
	}

	// 计时器已经停止
	if (this.started && !this.interval) {
		return;
	}

	this.started = true;

	var elapsed = new Date().getTime() - this.start;
	this.timeout = elapsed > this.maxtimeOutMillis;

	// 条件符合，或者超时，停止计时器
	// condition fulfilled, or timeout, stop the timer
	if (this.condition || this.timeout) {
		this.stopTimer();
	}

    if (!this.condition && !this.timeout) {
        // 没有超时，但条件不符合，继续等待
    	// it's not timeout, but the condition is not fulfilled, waiting...
    	this.condition = this.testFx();
    }
    else if (this.timeout) {
        // 已超时
    	// timeout
        if (this.onTimeout) this.onTimeout();
    }
    else {
        // 条件已满足
    	// condition fulfilled
        if (this.onReady) this.onReady();
    }
};

WaitFor.prototype.startTimer = function() {
	var wait = this;
	this.interval = setInterval(function() {
		wait.timerFn();
    },
    DefaultTimerInterval);
};

WaitFor.prototype.stopTimer = function() {
	if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
	}
};

exports.create = function(testFx, onReady, onTimeout, timeOutMillis) {
	return new WaitFor(testFx, onReady, onTimeout, timeOutMillis);
};
