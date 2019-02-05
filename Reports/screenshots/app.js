var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "to check the page title|Protractor Demo",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4ce77aa13e0f53ef683966caad78e075",
        "instanceId": 11580,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548240065781,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548240066018,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548240073112,
                "type": ""
            }
        ],
        "screenShotFile": "00470003-00e7-00ef-0020-007800c000c6.png",
        "timestamp": 1548240063499,
        "duration": 9604
    },
    {
        "description": "Check TMS signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2453dac6905ee9ab106f5fb79d00f170",
        "instanceId": 49300,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548241012815,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548241013529,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548241020742,
                "type": ""
            }
        ],
        "screenShotFile": "00de0032-0025-00e3-006f-00e2005f0010.png",
        "timestamp": 1548241011000,
        "duration": 9736
    },
    {
        "description": "Check TMS signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "e48899ab4d1e1349269d0009f80a65fd",
        "instanceId": 41608,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548241665620,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548241666679,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548241675068,
                "type": ""
            }
        ],
        "screenShotFile": "005900e9-003c-0076-00f1-00ff005e00a1.png",
        "timestamp": 1548241663821,
        "duration": 11231
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1f713292eabca9ff9ae855cef1f5c1a0",
        "instanceId": 44328,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548241760648,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548241761416,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548241769572,
                "type": ""
            }
        ],
        "screenShotFile": "0036007e-0025-0081-0023-0044005c0037.png",
        "timestamp": 1548241758772,
        "duration": 10794
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "11586c436bd50ddc06ddfb21bfb92275",
        "instanceId": 2424,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548242066601,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242067294,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548242075253,
                "type": ""
            }
        ],
        "screenShotFile": "00b00095-0039-004e-00ae-005000ec002d.png",
        "timestamp": 1548242064652,
        "duration": 10592
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "11586c436bd50ddc06ddfb21bfb92275",
        "instanceId": 2424,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548242076275,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242083711,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242083712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242083712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242083712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242083712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242083712,
                "type": ""
            }
        ],
        "screenShotFile": "00ed0053-0065-00ae-0018-00010005007f.png",
        "timestamp": 1548242075643,
        "duration": 8056
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6f360f24b1d7568f70ebd973748e01df",
        "instanceId": 43108,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548242782101,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242782839,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790202,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790204,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790204,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548242790204,
                "type": ""
            }
        ],
        "screenShotFile": "00f40012-0034-00df-0032-00a9006500d1.png",
        "timestamp": 1548242781156,
        "duration": 9031
    },
    {
        "description": "Create new project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "349cda67570bdd345829b702111e1cd1",
        "instanceId": 24448,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.findElements(By(css selector, [class=b-btn-standart b-btn-standart-min]))\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:44:18)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create new project\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548243440657,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243441318,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243449213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243449214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243449214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243449214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243449214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548243449214,
                "type": ""
            }
        ],
        "screenShotFile": "00c8002a-007a-0042-004a-00ac00af00fd.png",
        "timestamp": 1548243438694,
        "duration": 10557
    },
    {
        "description": "Create new project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c9d2d28480c69992041e59b860cd7d66",
        "instanceId": 2016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.findElements(By(css selector, [class=b-btn-standart b-btn-standart-min]))\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:44:18)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create new project\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548244177240,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244177924,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244185150,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244185150,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244185150,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244185150,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244185151,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244185151,
                "type": ""
            }
        ],
        "screenShotFile": "00a10087-000b-00ed-00a3-00ff001a00e0.png",
        "timestamp": 1548244175477,
        "duration": 9739
    },
    {
        "description": "Create new project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "dfa8d58dd7f185e65a915cba0ff16379",
        "instanceId": 23808,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.findElements(By(css selector, [class=b-btn-standart b-btn-standart-min]))\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:46:18)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create new project\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548244264012,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244264802,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244272236,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244272236,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244272236,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244272236,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244272236,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244272236,
                "type": ""
            }
        ],
        "screenShotFile": "00800076-0024-00a6-005c-00a50039004d.png",
        "timestamp": 1548244261955,
        "duration": 10339
    },
    {
        "description": "Create new project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b5e91265f9dea0b4a70cd9d1281ca5d1",
        "instanceId": 15168,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.findElements(By(css selector, [class=b-btn-standart b-btn-standart-min]))\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:46:18)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create new project\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548244310530,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244311163,
                "type": ""
            }
        ],
        "screenShotFile": "00260052-0077-00bf-00ee-008600750074.png",
        "timestamp": 1548244308506,
        "duration": 5100
    },
    {
        "description": "Create new project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a163721d7004ae07444f637d7cb76a87",
        "instanceId": 20276,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: An invalid or illegal selector was specified\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebDriver.findElements(By(css selector, [class=b-btn-standart b-btn-standart-min]))\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at thenableWebDriverProxy.findElements (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:46:18)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Create new project\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548244442682,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548244443409,
                "type": ""
            }
        ],
        "screenShotFile": "006f009b-0050-00a4-004e-0058003900f4.png",
        "timestamp": 1548244440812,
        "duration": 5559
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "07213f4bd4cff990a66b45a9d6a3728a",
        "instanceId": 49604,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245100039,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245101035,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548245101490,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245101920,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109229,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245109231,
                "type": ""
            }
        ],
        "screenShotFile": "00250055-0020-002d-00ec-008a00830052.png",
        "timestamp": 1548245098292,
        "duration": 10912
    },
    {
        "description": "Create new project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "57192ad9ae50d0c5577c12c23548e47b",
        "instanceId": 8632,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: Angular could not be found on the page http://54.236.35.240/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page http://54.236.35.240/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at executeAsyncScript_.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:720:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Create new project\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245350557,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245351169,
                "type": ""
            }
        ],
        "screenShotFile": "00050093-0041-003f-0070-002900a8008b.png",
        "timestamp": 1548245348450,
        "duration": 12853
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "29d054c8f5df7dea2048c45675f7c236",
        "instanceId": 14944,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245533677,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245534101,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548245534534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245534946,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542120,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542122,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542122,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542122,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542122,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542122,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245542122,
                "type": ""
            }
        ],
        "screenShotFile": "002d00d4-0091-007f-0065-00be008e004d.png",
        "timestamp": 1548245531856,
        "duration": 10246
    },
    {
        "description": "check user name and password|sign in test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "75be5519d548b5a41ee01e0259a25966",
        "instanceId": 40220,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"main\"]/div/div[2]/div[1]/div/div[2]/button)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"main\"]/div/div[2]/div[1]/div/div[2]/button)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:32:49)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"check user name and password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245668504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245668822,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548245669438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245669999,
                "type": ""
            }
        ],
        "screenShotFile": "00430066-0065-00f8-002c-00d200dd007b.png",
        "timestamp": 1548245666661,
        "duration": 6093
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "704718dd9562bb0fc0a65fac844b2ed5",
        "instanceId": 37392,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245744602,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245744908,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548245746554,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245747032,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245754352,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245754353,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245754353,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245754353,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245754353,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245754353,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245759588,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548245759588,
                "type": ""
            }
        ],
        "screenShotFile": "005a00f7-0092-0079-0058-007b00f90077.png",
        "timestamp": 1548245742774,
        "duration": 16799
    },
    {
        "description": "check user name and password|sign in test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b80d194a010a6dce5996d35fc3b0a9fd",
        "instanceId": 35564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: cannot focus element\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: cannot focus element\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:46:11)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"check user name and password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248107118,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248107539,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548248109251,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248109665,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248116494,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248116494,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248116494,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248116494,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248116495,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248116495,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248118755,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248118755,
                "type": ""
            }
        ],
        "screenShotFile": "003b00b6-0074-006f-0022-00ed004f0069.png",
        "timestamp": 1548248105113,
        "duration": 13883
    },
    {
        "description": "check user name and password|sign in test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "74a9731f39cecb24d8c40b3ae182930b",
        "instanceId": 42460,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: Element <button type=\"submit\" name=\"create\" class=\"b-btn-standart nextButton b-fltr-btn\">...</button> is not clickable at point (996, 686). Other element would receive the click: <div class=\"vdatetime-overlay\"></div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: Element <button type=\"submit\" name=\"create\" class=\"b-btn-standart nextButton b-fltr-btn\">...</button> is not clickable at point (996, 686). Other element would receive the click: <div class=\"vdatetime-overlay\"></div>\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:53:8)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"check user name and password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248263585,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248264714,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548248266398,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248266883,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248273822,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248273822,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248273822,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248273822,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248273822,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248273822,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248276102,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248276102,
                "type": ""
            }
        ],
        "screenShotFile": "004200e4-00b6-006b-00ef-003a00850082.png",
        "timestamp": 1548248261646,
        "duration": 15947
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "fac35f3a72eff4dbe2d09bc562038e42",
        "instanceId": 46428,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248479890,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248480183,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548248481958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248482415,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248489532,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248489533,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248489533,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248489534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248489534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248489534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248491818,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248491818,
                "type": ""
            }
        ],
        "screenShotFile": "00ec00c2-006b-00be-006f-007a00b40045.png",
        "timestamp": 1548248477934,
        "duration": 24575
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ddda51a7e2e59fe2812503e636e12cc6",
        "instanceId": 23124,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248593120,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248593933,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548248595567,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248595982,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248602479,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248602479,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248602479,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248602479,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248602480,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248602480,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248604601,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548248604601,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/api/project/?delivery_date=2019-01-23T13%3A03%3A00.000Z&title=12345&from_language=en&to_language=ar&firstCreateEdit=1 - Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)",
                "timestamp": 1548248615522,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/js/app.js 0:1203066 Uncaught TypeError: Cannot read property 'data' of undefined",
                "timestamp": 1548248615522,
                "type": ""
            }
        ],
        "screenShotFile": "005300c9-00d7-00eb-00f9-0053006a00c8.png",
        "timestamp": 1548248591344,
        "duration": 24172
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a2686c8c9914a9d5e3e7ccc62528876e",
        "instanceId": 46720,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250881171,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250884955,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548250888267,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250890201,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250926439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250928530,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250928755,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250928975,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250929213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250973560,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250975860,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548250975860,
                "type": ""
            }
        ],
        "screenShotFile": "00940006-001e-00e4-00aa-00c400100017.png",
        "timestamp": 1548250878938,
        "duration": 108914
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9a907603db664c4875f0931e2b578d45",
        "instanceId": 21092,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251168494,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251170239,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548251171895,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251172278,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251183712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251183712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251183712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251183712,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251183713,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251183713,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251184995,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251184995,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251195016,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251195016,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251195016,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251195016,
                "type": ""
            }
        ],
        "screenShotFile": "008c0087-0069-00af-00f7-00c700bd00e2.png",
        "timestamp": 1548251166407,
        "duration": 28592
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "5dbd0ac453a9a83d018bd0d098306f2f",
        "instanceId": 47924,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251426478,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251427285,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548251429988,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251430385,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251438230,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251438231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251438231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251438231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251438231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251438231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251439538,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251439538,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251444668,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251444680,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251444702,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251444763,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/104 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548251449243,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251454335,
                "type": ""
            }
        ],
        "screenShotFile": "00e600d8-00e5-00d8-0010-0015007a0062.png",
        "timestamp": 1548251424317,
        "duration": 30000
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2c5eb7ad40c69436f70073684c4ec14f",
        "instanceId": 49584,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251577308,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251578752,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548251581112,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251581535,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251589635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251589635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251589635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251589635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251589637,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251589637,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251590950,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251590951,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251597504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251597504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251597504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251597504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/105 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548251599771,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251601823,
                "type": ""
            }
        ],
        "screenShotFile": "00c200aa-0018-00fc-00a8-006c0024008d.png",
        "timestamp": 1548251575137,
        "duration": 31852
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "89c730af64a09a35e2f9f1c684d79c92",
        "instanceId": 47340,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251722170,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251723445,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548251725232,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251725610,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251735975,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251735976,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251735976,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251735976,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251735976,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251735976,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251737301,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251737301,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251743767,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251743767,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251743767,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251743767,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/106 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548251746056,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548251748112,
                "type": ""
            }
        ],
        "screenShotFile": "00a300d7-0052-00f2-008d-00f8008400c3.png",
        "timestamp": 1548251720153,
        "duration": 33117
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "95fcda4ceea20a72b094d52805a762c0",
        "instanceId": 49088,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252025591,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252026474,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252028130,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252028563,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252035707,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252035709,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252035709,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252035709,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252035710,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252035710,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252036960,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252036961,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252042963,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252042963,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252042964,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252042964,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/107 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548252045319,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252047423,
                "type": ""
            }
        ],
        "screenShotFile": "00780088-00fc-0045-00fa-000500460075.png",
        "timestamp": 1548252023445,
        "duration": 29185
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2bbb10b655171da3e781d5bc280f58cb",
        "instanceId": 38884,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252103434,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252104153,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252105892,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252106248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252117188,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252117189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252117189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252117189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252117189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252117189,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252118514,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252118514,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252125248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252125249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252125249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252125249,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/108 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548252127623,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252129810,
                "type": ""
            }
        ],
        "screenShotFile": "004300bd-0016-0032-00fc-0060008200aa.png",
        "timestamp": 1548252101288,
        "duration": 33688
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "19f744fca2709aa4518ecaa7cf0393cf",
        "instanceId": 16420,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252193840,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252194594,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252204414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252204414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252204414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252204414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252204414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252205682,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252205682,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252209738,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252209747,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252209771,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252209802,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/109 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548252214589,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252216659,
                "type": ""
            }
        ],
        "screenShotFile": "00d3000c-005b-004f-0022-006d00ba00a1.png",
        "timestamp": 1548252191793,
        "duration": 30009
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0c59cb3d0eecb8f43073606b5dc8bf71",
        "instanceId": 18172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252286103,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252287505,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252301181,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252301181,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252301181,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252301182,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252301182,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252302493,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252302493,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252309391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252309391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252309391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252309391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/110 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548252311646,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252313802,
                "type": ""
            }
        ],
        "screenShotFile": "002f00c0-0041-0002-0041-005d00880023.png",
        "timestamp": 1548252284166,
        "duration": 34807
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9879075c15cf01f43997d4f15b4099cd",
        "instanceId": 2560,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"main\"]/div/div[1]/div[2]/div/div[2]/button)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"main\"]/div/div[1]/div[2]/div/div[2]/button)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:62:8)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"check user name and password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252357691,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252359029,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252360808,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252361256,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252365951,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252365954,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252365954,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252365954,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252365955,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252365955,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252367116,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252367116,
                "type": ""
            }
        ],
        "screenShotFile": "00e00005-00db-003d-00b9-00e5007f00eb.png",
        "timestamp": 1548252355473,
        "duration": 12944
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "bc8fe50eeba645ca88cfcb54dcf237c3",
        "instanceId": 26872,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252437533,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252438522,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252440119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252440537,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252446005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252446005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252446005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252446005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252446005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252446005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252447304,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252447304,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252455926,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252455927,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252455927,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252455927,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/112 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548252459286,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252463389,
                "type": ""
            }
        ],
        "screenShotFile": "007600c1-00bd-00e7-003f-002600cc0051.png",
        "timestamp": 1548252435625,
        "duration": 32945
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6805a3102a8b248f3f60c1dc2d874619",
        "instanceId": 43804,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252549787,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252550374,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252550913,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252551363,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562029,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562029,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562030,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562030,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562030,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562030,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252562030,
                "type": ""
            }
        ],
        "screenShotFile": "00980005-007e-00d0-0096-00ba00e20072.png",
        "timestamp": 1548252547624,
        "duration": 14387
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "52bf66e4cfcd439dad828e7853d62a9e",
        "instanceId": 32420,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252579362,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252580497,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252588050,
                "type": ""
            }
        ],
        "screenShotFile": "00a80030-0029-0043-00e7-0002000500e9.png",
        "timestamp": 1548252577480,
        "duration": 10554
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "69fc2b7a154b4b4923caaaeb0b6f1545",
        "instanceId": 23872,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548252910025,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548252911308,
                "type": ""
            }
        ],
        "screenShotFile": "00870078-00ae-003e-00c6-009600a90035.png",
        "timestamp": 1548252908275,
        "duration": 10898
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "deb7a22485489b0ef09556f056ed9b19",
        "instanceId": 5488,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253338658,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253339627,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548253341248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253341740,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253348558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253348558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253348558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253348558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253348559,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253348559,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253349877,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253349877,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253360973,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253360973,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253360973,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253360973,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/113 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548253364195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253368384,
                "type": ""
            }
        ],
        "screenShotFile": "00880057-0073-0074-00fb-001500870041.png",
        "timestamp": 1548253336161,
        "duration": 37432
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1ae516af6de1a51c66cf306505d387ec",
        "instanceId": 19868,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253479202,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253480026,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548253481627,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253481990,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253486119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253486119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253486119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253486119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253486119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253486119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253487248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253487248,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253495826,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253495826,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253495826,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253495826,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/114 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548253499152,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253503284,
                "type": ""
            }
        ],
        "screenShotFile": "000400ca-0074-0081-0034-00d800be008d.png",
        "timestamp": 1548253477215,
        "duration": 31237
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "34e40291fbcd2e356b67904d34f5b9f4",
        "instanceId": 46340,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253542340,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253545271,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548253547376,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253548444,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253560061,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253560061,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253560061,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253560061,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253560153,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253560153,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253561369,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253561369,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253570303,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/number-input.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253570303,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/Template%20images/icons/check.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253570303,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253570303,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/index.html#/vue/project/assign_type/115 0:0 Uncaught ReferenceError: checkRadio is not defined",
                "timestamp": 1548253573626,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/line-vertical.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253577752,
                "type": ""
            }
        ],
        "screenShotFile": "00f100e3-0043-0029-001f-00b5003000d3.png",
        "timestamp": 1548253534822,
        "duration": 48113
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "48495c53ae3ae92e2655d28b76ff8825",
        "instanceId": 23936,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253839382,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253840082,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548253840745,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253841178,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848788,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848788,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848788,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848788,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848789,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848789,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253848789,
                "type": ""
            }
        ],
        "screenShotFile": "0095007f-005e-0026-0007-0057001800b3.png",
        "timestamp": 1548253837270,
        "duration": 11499
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "3fc8738f75276af922c816b6edf39b08",
        "instanceId": 27492,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548253859666,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548253860826,
                "type": ""
            }
        ],
        "screenShotFile": "00d000cf-00a2-006c-0060-005200370097.png",
        "timestamp": 1548253857936,
        "duration": 10941
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1d37a1ceaa8d91ae68be0b5f55464a40",
        "instanceId": 9188,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548254129438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548254130596,
                "type": ""
            }
        ],
        "screenShotFile": "00b400bf-0052-0088-0073-003e00d900c6.png",
        "timestamp": 1548254127604,
        "duration": 35660
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1335c1ad708e6f639434c0ed1350860a",
        "instanceId": 45460,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548254524380,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548254524847,
                "type": ""
            }
        ],
        "screenShotFile": "00820001-00e5-0008-00de-00c500a30096.png",
        "timestamp": 1548254520889,
        "duration": 25092
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b3f106be100df418d858b33150f65eb7",
        "instanceId": 26148,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313202997,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548313204097,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313211173,
                "type": ""
            }
        ],
        "screenShotFile": "008c0098-0096-00cd-0086-0077005a0047.png",
        "timestamp": 1548313201325,
        "duration": 15763
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ad305b22d45f9e8b1a0f468812352839",
        "instanceId": 44820,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"loginform\"]/div[2]/button)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"loginform\"]/div[2]/button)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:72:11)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313463836,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548313464996,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313472098,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js 5 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1548313483431,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://tpc.googlesyndication.com/safeframe/1-0-31/html/container.html - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1548313495169,
                "type": ""
            }
        ],
        "screenShotFile": "008000bd-00a1-00bb-00cb-00a3000700a9.png",
        "timestamp": 1548313462140,
        "duration": 54789
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ccdce2a791ced0eaad0965b3ea9d7165",
        "instanceId": 44792,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"loginform\"]/div[2]/button)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"loginform\"]/div[2]/button)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:70:11)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313614270,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548313615324,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313617453,
                "type": ""
            }
        ],
        "screenShotFile": "00ba0077-0047-0048-00e1-00160082009c.png",
        "timestamp": 1548313612582,
        "duration": 27891
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "5988e9266333cbf759dacde4cde9580e",
        "instanceId": 40520,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313765936,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548313767062,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313769102,
                "type": ""
            }
        ],
        "screenShotFile": "00760034-00f2-00fb-00e8-009e00da008e.png",
        "timestamp": 1548313764088,
        "duration": 10739
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ec459e402a4a0e378e63380f59ca69a9",
        "instanceId": 45564,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313947719,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548313948811,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548313950935,
                "type": ""
            }
        ],
        "screenShotFile": "009e00c9-0068-00cc-00f8-0011008100a9.png",
        "timestamp": 1548313946043,
        "duration": 10874
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4dd4684e2f792c6a13cd38f3da758056",
        "instanceId": 50224,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314158638,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314159997,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314162155,
                "type": ""
            }
        ],
        "screenShotFile": "00d90058-0041-0078-0060-006f000d0022.png",
        "timestamp": 1548314156852,
        "duration": 11200
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "421fe49ee5243b32d6112c201227ee33",
        "instanceId": 18036,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314388609,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314389794,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314391741,
                "type": ""
            }
        ],
        "screenShotFile": "00760050-0009-0071-00b3-003200d00072.png",
        "timestamp": 1548314386905,
        "duration": 11186
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6b5b610dc9945169a97a06374094ac5f",
        "instanceId": 36788,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314430056,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314431317,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314433331,
                "type": ""
            }
        ],
        "screenShotFile": "00d000da-00ef-0044-006b-004b002e0083.png",
        "timestamp": 1548314428291,
        "duration": 14995
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c95d654deed7d606d97f9f87ae745c1d",
        "instanceId": 27160,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314482817,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314483958,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314486039,
                "type": ""
            }
        ],
        "screenShotFile": "00d50094-00c8-006d-0038-006f006c004a.png",
        "timestamp": 1548314481071,
        "duration": 37992
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "d95bffa9f1335b491d065b86f03a3497",
        "instanceId": 40344,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, *[id=\"c\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, *[id=\"c\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:74:9)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314740042,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314741696,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314743713,
                "type": ""
            }
        ],
        "screenShotFile": "0084001a-00c2-0073-00de-006e0077002c.png",
        "timestamp": 1548314738175,
        "duration": 26940
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c63892eca1b6aa568e577ddd377b54c3",
        "instanceId": 42280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314850999,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314852454,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314854274,
                "type": ""
            }
        ],
        "screenShotFile": "002000ff-00ae-0002-00ae-00cb004c00a8.png",
        "timestamp": 1548314849287,
        "duration": 31455
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9d0542fd8e29c9cc5d069ccce8bb5d61",
        "instanceId": 37200,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314972559,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548314973809,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548314975890,
                "type": ""
            }
        ],
        "screenShotFile": "009d00c6-00cd-00f9-0055-00b600f00089.png",
        "timestamp": 1548314970891,
        "duration": 23609
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cbeafec884719a2f197527d08a829f22",
        "instanceId": 3860,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315091364,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548315093978,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315094603,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548315102834,
                "type": ""
            }
        ],
        "screenShotFile": "007000b1-00ba-001a-009a-00e200ab0003.png",
        "timestamp": 1548315089625,
        "duration": 24002
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "e95b79537dfa0bb4423421fc6e58784a",
        "instanceId": 51052,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315257115,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548315258237,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315260304,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548315275290,
                "type": ""
            }
        ],
        "screenShotFile": "006e005a-001c-0011-0038-00fa0051000e.png",
        "timestamp": 1548315255374,
        "duration": 31234
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6382d94e74f2075088653cf99196a4d0",
        "instanceId": 25268,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315675181,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548315676273,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315678308,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548315694039,
                "type": ""
            }
        ],
        "screenShotFile": "00ee00f1-008a-00bb-0001-006a00600050.png",
        "timestamp": 1548315673508,
        "duration": 32299
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "560a8c032f673d951dd13c167fa29cac",
        "instanceId": 51148,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315855000,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548315856134,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315858232,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548315872524,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://securepubads.g.doubleclick.net/gpt/pubads_impl_294.js 0 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1548315874145,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://securepubads.g.doubleclick.net/gpt/pubads_impl_294.js 0 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1548315874146,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://securepubads.g.doubleclick.net/gpt/pubads_impl_294.js 0 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1548315874146,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://securepubads.g.doubleclick.net/gpt/pubads_impl_294.js 0 chrome.loadTimes() is deprecated, instead use standardized API: nextHopProtocol in Navigation Timing 2. https://www.chromestatus.com/features/5637885046816768.",
                "timestamp": 1548315874147,
                "type": ""
            }
        ],
        "screenShotFile": "00ec0073-003c-0090-00da-006900b0007b.png",
        "timestamp": 1548315853068,
        "duration": 31738
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a8c82d62826d86b25d9949bc0ba6a848",
        "instanceId": 35636,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548315974180,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548315975119,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548315992997,
                "type": ""
            }
        ],
        "screenShotFile": "00db000b-00f2-00a1-00d3-002d003c00c3.png",
        "timestamp": 1548315972505,
        "duration": 31904
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "3682b1aa85fcf900c4c2a1d4c12499e8",
        "instanceId": 18932,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"click-to-change\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"click-to-change\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:70:16)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000e005d-00d8-002c-00a4-008a00d2002f.png",
        "timestamp": 1548316306975,
        "duration": 2057
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "f9d0b56377c29ca02cc06f1bfef00234",
        "instanceId": 49948,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"click-to-change\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"click-to-change\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:71:16)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00610073-00f7-00f6-00ed-0032004a0085.png",
        "timestamp": 1548316332284,
        "duration": 6799
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0b67653c367a011e1ea618755a746ea1",
        "instanceId": 2016,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ef0044-0085-00b7-0039-003900660032.png",
        "timestamp": 1548316511477,
        "duration": 8146
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a03b0162484e97886d932bc9f5824b01",
        "instanceId": 4468,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548316880443,
                "type": ""
            }
        ],
        "screenShotFile": "00810045-0006-0077-00c3-003c00a10093.png",
        "timestamp": 1548316870273,
        "duration": 20332
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2b10a09e5c6a6bb8d8672307a6425470",
        "instanceId": 34632,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317029034,
                "type": ""
            }
        ],
        "screenShotFile": "007b00b0-00c5-00d3-00f1-004700c700cb.png",
        "timestamp": 1548317019756,
        "duration": 11533
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "14a1059b4d3e614490bdcfac300cadc3",
        "instanceId": 42380,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: unknown error: cannot focus element\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "WebDriverError: unknown error: cannot focus element\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:83:15)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317130726,
                "type": ""
            }
        ],
        "screenShotFile": "00a200a7-0064-0095-001f-00e100d600d6.png",
        "timestamp": 1548317121133,
        "duration": 11817
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cad2a1d3e8e22feed4da86be2983ed50",
        "instanceId": 19800,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317183964,
                "type": ""
            }
        ],
        "screenShotFile": "0045004a-00e2-0017-00b2-004600ff00ca.png",
        "timestamp": 1548317174697,
        "duration": 15659
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "549373a48dee1e451e367f51daa8013e",
        "instanceId": 10616,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317251086,
                "type": ""
            }
        ],
        "screenShotFile": "0000001e-003c-0009-007f-004400bd0090.png",
        "timestamp": 1548317241610,
        "duration": 15828
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "19e125bff913c4f04ef0894aea73e6ed",
        "instanceId": 39072,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005800fc-0097-00ae-004a-00d9008800c7.png",
        "timestamp": 1548317343399,
        "duration": 15402
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9a2f001c5a165ac94f4c49b32f7c5fe8",
        "instanceId": 41296,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js 5 Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
                "timestamp": 1548317409023,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317415160,
                "type": ""
            }
        ],
        "screenShotFile": "00590024-00f5-00a1-00c4-00f600320099.png",
        "timestamp": 1548317386230,
        "duration": 40538
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b55b99f718b02d2eba55894a3b414862",
        "instanceId": 18584,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317464569,
                "type": ""
            }
        ],
        "screenShotFile": "00c30066-00e2-002d-0093-00240025009e.png",
        "timestamp": 1548317454494,
        "duration": 21775
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "5e65c10188cc1fb47172d16a47e2d691",
        "instanceId": 4772,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548317696472,
                "type": ""
            }
        ],
        "screenShotFile": "002f0083-00f4-00b4-00c8-00ca00e50041.png",
        "timestamp": 1548317685661,
        "duration": 23837
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "964ef78f9cacedd0b5996ee2260cc614",
        "instanceId": 2012,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: button is not defined"
        ],
        "trace": [
            "ReferenceError: button is not defined\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:89:35)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002f006a-0014-0082-00c3-00e600c700b6.png",
        "timestamp": 1548317893279,
        "duration": 15
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "5af66a8a7288f174bc84382f8e56bf8f",
        "instanceId": 30284,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: button is not defined"
        ],
        "trace": [
            "ReferenceError: button is not defined\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:89:35)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a100ac-008a-0036-005a-00f200760053.png",
        "timestamp": 1548317906992,
        "duration": 13
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "769baab52a78f993887a6c3b9fe54b2a",
        "instanceId": 248,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548318027300,
                "type": ""
            }
        ],
        "screenShotFile": "0012008e-005e-00c8-0099-003500c900aa.png",
        "timestamp": 1548318017066,
        "duration": 22091
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "66956f168e0f152d6792e5088b462148",
        "instanceId": 39496,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548318205693,
                "type": ""
            }
        ],
        "screenShotFile": "002e0046-001f-00dd-001d-0054004700bd.png",
        "timestamp": 1548318195839,
        "duration": 21508
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "821cef047ce90193f777cc22ced35d5c",
        "instanceId": 48828,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548318454622,
                "type": ""
            }
        ],
        "screenShotFile": "00d200d4-00d9-00f5-0041-006e001c001d.png",
        "timestamp": 1548318444489,
        "duration": 13237
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c9e29fa4d67464236cb46d27fee4fda2",
        "instanceId": 25692,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319212734,
                "type": ""
            }
        ],
        "screenShotFile": "0084005a-0068-008e-00c9-00530051006e.png",
        "timestamp": 1548319196358,
        "duration": 16363
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0e26f5dcc246d4bda6bc02b9cb3e9dec",
        "instanceId": 26476,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, .form-control)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, .form-control)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:77:16)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00070060-0046-0025-00b8-00500090009e.png",
        "timestamp": 1548319246905,
        "duration": 10010
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "f5bd6def0407f73067d4ff367af96514",
        "instanceId": 50316,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319297716,
                "type": ""
            }
        ],
        "screenShotFile": "003d0055-0006-00fd-0049-00480044006c.png",
        "timestamp": 1548319278446,
        "duration": 19253
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "57083d0db0ddf5f0a4836d796b328e21",
        "instanceId": 44104,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: element(...).first is not a function"
        ],
        "trace": [
            "TypeError: element(...).first is not a function\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:80:58)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004b00b1-0072-0084-00b0-00230005001e.png",
        "timestamp": 1548319401731,
        "duration": 15
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a1588b780c6fa4c0a4249d800ede5219",
        "instanceId": 35852,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319522991,
                "type": ""
            }
        ],
        "screenShotFile": "001b0041-006e-00b1-00cf-006200850007.png",
        "timestamp": 1548319490767,
        "duration": 37883
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "3f38007f1a93a6011333397662562d38",
        "instanceId": 49832,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319623409,
                "type": ""
            }
        ],
        "screenShotFile": "003a004d-0094-00da-0044-00b500ec0028.png",
        "timestamp": 1548319607274,
        "duration": 19448
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6ff85df28fd116fa8f68ed5ddc026915",
        "instanceId": 51064,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319720641,
                "type": ""
            }
        ],
        "screenShotFile": "00ff0098-0091-00b1-00e5-00ac008900cf.png",
        "timestamp": 1548319704364,
        "duration": 19479
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0c139b4cc3278a6e910ca31d2537fbc2",
        "instanceId": 21336,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319829297,
                "type": ""
            }
        ],
        "screenShotFile": "003700d0-008c-006b-0080-00a0005600cf.png",
        "timestamp": 1548319813013,
        "duration": 19982
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "897cb728e9c0555dfb0a86e0eacca505",
        "instanceId": 27332,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548319919605,
                "type": ""
            }
        ],
        "screenShotFile": "005c00ef-009d-007a-003c-005b0083002f.png",
        "timestamp": 1548319902671,
        "duration": 20327
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "7f7911d9e2448c3c636cd695e21e888a",
        "instanceId": 35388,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548320118447,
                "type": ""
            }
        ],
        "screenShotFile": "00660018-0088-0033-0089-008d00340054.png",
        "timestamp": 1548320101905,
        "duration": 21059
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "3179cb5a40bad311e55ee0efa9474c73",
        "instanceId": 49832,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548320156851,
                "type": ""
            }
        ],
        "screenShotFile": "00de003a-004f-009b-0005-003000f50009.png",
        "timestamp": 1548320140605,
        "duration": 19612
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "612982abbea8769cdacfbac8aa83d701",
        "instanceId": 21352,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://tpc.googlesyndication.com/safeframe/1-0-31/html/container.html - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1548320215108,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://temp-mail.org/utilcave_com/inc/ezcl.webp?cb=4 0:284 Uncaught ReferenceError: _ezaq is not defined",
                "timestamp": 1548320244126,
                "type": ""
            }
        ],
        "screenShotFile": "00c6007f-00f7-007a-000a-0027001600dc.png",
        "timestamp": 1548320186135,
        "duration": 60426
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "3eb72fdf49ef2f44216fa3d26716d425",
        "instanceId": 51416,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548320297894,
                "type": ""
            }
        ],
        "screenShotFile": "00a700ce-00a5-00d2-005b-00d700ef0056.png",
        "timestamp": 1548320275406,
        "duration": 22482
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "7bea0672989b1e407ba30fece7cca865",
        "instanceId": 51992,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ba0072-00a1-00e6-0020-00ce009000e4.png",
        "timestamp": 1548321596934,
        "duration": 10239
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "49b4fc859afe6f59a0aa717c8780de4e",
        "instanceId": 53216,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007300d4-0039-00ed-0050-0047004900cd.png",
        "timestamp": 1548322286029,
        "duration": 8261
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "8886f54fb6084c2cd2c2226ba7408d25",
        "instanceId": 55092,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009d00e3-0059-007d-00bb-00b100f800c8.png",
        "timestamp": 1548325896396,
        "duration": 7189
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4fdfa356bde9f2525ad42738c5b04624",
        "instanceId": 10224,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: config is not defined"
        ],
        "trace": [
            "ReferenceError: config is not defined\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:64:30)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0082003b-00d3-0052-0012-0089002f006f.png",
        "timestamp": 1548326658358,
        "duration": 10
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "27e088a7a4be445c31e1845adeefdd5d",
        "instanceId": 55744,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: config is not defined"
        ],
        "trace": [
            "ReferenceError: config is not defined\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:64:30)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00710049-00f7-00a9-0005-003c00fe002d.png",
        "timestamp": 1548329479762,
        "duration": 12
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a01e35816429ed0f0b39e74502200328",
        "instanceId": 43136,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548329534990,
                "type": ""
            }
        ],
        "screenShotFile": "002800e5-00d1-005e-0098-00f7002900f0.png",
        "timestamp": 1548329505262,
        "duration": 29715
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "448dcc37901ea22c6cda297e65eb4d56",
        "instanceId": 45640,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548329659819,
                "type": ""
            }
        ],
        "screenShotFile": "00db00ea-009f-00b2-00fc-006000d300d6.png",
        "timestamp": 1548329629195,
        "duration": 30603
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c0e297391d90e01d3255ac8ce61d1634",
        "instanceId": 49720,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://pagead2.googlesyndication.com/pagead/js/r20190116/r20180604/show_ads_impl.js was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1548332970957,
                "type": ""
            }
        ],
        "screenShotFile": "00970089-0029-00b0-005d-00db002200d1.png",
        "timestamp": 1548332949880,
        "duration": 21061
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "228942b23667894c34c2490fe88faab3",
        "instanceId": 52624,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00cf00d4-000a-0086-0010-0093004a00da.png",
        "timestamp": 1548333022553,
        "duration": 21599
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "614d16d0da04b425c42bffb3c60f62df",
        "instanceId": 34232,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004100cb-0093-00c4-0089-00aa00870017.png",
        "timestamp": 1548333443789,
        "duration": 2399
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "536e7821c54c72553c72a57a2c0241e8",
        "instanceId": 31288,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001100a9-0014-0049-00cb-00fd00df009e.png",
        "timestamp": 1548333514472,
        "duration": 39087
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "695e1652d16a9f873fd477d18f631397",
        "instanceId": 54280,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009300b0-0029-0072-003e-00f400280009.png",
        "timestamp": 1548333788190,
        "duration": 5993
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1f60398fa2672951bd9646a7820989b5",
        "instanceId": 55740,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: element not interactable\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)"
        ],
        "trace": [
            "ElementNotVisibleError: element not interactable\n  (Session info: chrome=71.0.3578.98)\n  (Driver info: chromedriver=2.45.615291 (ec3682e3c9061c10f26ea9e5cdcf3c53f3f74387),platform=Windows NT 10.0.17134 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at thenableWebDriverProxy.schedule (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:73:19)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d9004a-001e-00d8-0025-0019002300e6.png",
        "timestamp": 1548333970640,
        "duration": 3129
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1c89278936a0ebf94b74287b7b7ff3fe",
        "instanceId": 56132,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a20035-0051-0048-009f-00f300e100e5.png",
        "timestamp": 1548334007179,
        "duration": 5529
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0061cee8008fe8b0f1f2c9cab5580c73",
        "instanceId": 12244,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00700004-00c0-004b-000c-00df00fa00eb.png",
        "timestamp": 1548334045102,
        "duration": 8477
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9c58ac8fa32986783c5f662739583f7b",
        "instanceId": 53436,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b7006f-0060-0050-0023-0025002000d9.png",
        "timestamp": 1548334160629,
        "duration": 18089
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "627e4468d64ce1eb655ae82cd08596b7",
        "instanceId": 52744,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fd0046-00dd-0094-001e-00f50010005e.png",
        "timestamp": 1548334210980,
        "duration": 15227
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "a61c9227b00e9ff2f230916d4c18ddca",
        "instanceId": 51572,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b0003f-0035-0090-00de-004b00d90016.png",
        "timestamp": 1548334378219,
        "duration": 24345
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "e5a635303bd50127ce021ea4e5661417",
        "instanceId": 53364,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006c00cc-00d1-009e-0091-00930020003e.png",
        "timestamp": 1548334449205,
        "duration": 22487
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "93f56327d76c77cc8e1d5552f7028e95",
        "instanceId": 19232,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"mail\"])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"mail\"])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:85:13)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548335515197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548335517002,
                "type": ""
            }
        ],
        "screenShotFile": "003000c2-004e-0020-00a7-004500a80006.png",
        "timestamp": 1548335500170,
        "duration": 18731
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "e009768461ba7fcb429a1f2088eb2a2a",
        "instanceId": 25184,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548335597391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548335597633,
                "type": ""
            }
        ],
        "screenShotFile": "00db0074-00a5-000c-00c3-00e9001500f2.png",
        "timestamp": 1548335581354,
        "duration": 23436
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "fca778eb4a35f90d679221ad08123623",
        "instanceId": 23808,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548335645873,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548335647069,
                "type": ""
            }
        ],
        "screenShotFile": "00ca000b-00b9-000b-00cb-008b00fc00e9.png",
        "timestamp": 1548335631291,
        "duration": 22913
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "98c54c38335058f9ae60ae275c73a532",
        "instanceId": 47592,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548335916300,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548335917484,
                "type": ""
            }
        ],
        "screenShotFile": "007d0098-00d7-00af-00b3-001c005000bf.png",
        "timestamp": 1548335901581,
        "duration": 28903
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "e4ebf3a54f7463991f911380900b2308",
        "instanceId": 10552,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548336146785,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548336148071,
                "type": ""
            }
        ],
        "screenShotFile": "000600e9-0010-00cf-0044-002200690049.png",
        "timestamp": 1548336131718,
        "duration": 94487
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9efe4268031fa5b9594c6065f44ed08d",
        "instanceId": 30656,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548336433584,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548336435118,
                "type": ""
            }
        ],
        "screenShotFile": "007d003a-0089-00aa-0002-00e50033005b.png",
        "timestamp": 1548336418748,
        "duration": 77370
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "88724440017deb4c86c2c9df2c5efb04",
        "instanceId": 38088,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, /html/body/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, /html/body/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:105:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548336783538,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548336784800,
                "type": ""
            }
        ],
        "screenShotFile": "00650010-0039-0017-001c-005d007e007a.png",
        "timestamp": 1548336768954,
        "duration": 29698
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6bf85d1269dae6b4753e16db1d87845f",
        "instanceId": 36256,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548337128013,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548337129098,
                "type": ""
            }
        ],
        "screenShotFile": "00e500fc-0057-00eb-00e3-003f00630030.png",
        "timestamp": 1548337116503,
        "duration": 25327
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1e5a0aae1d1052583239319a5de9bdb7",
        "instanceId": 20720,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548337204194,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548337205348,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548337221616,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login?client_redirect_to=vue/my-project - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548337221616,
                "type": ""
            }
        ],
        "screenShotFile": "00760092-00f3-000f-0085-003600f60085.png",
        "timestamp": 1548337192991,
        "duration": 28619
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "71322d10906b5dfb67409636bd450590",
        "instanceId": 30172,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548337449647,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548337450779,
                "type": ""
            }
        ],
        "screenShotFile": "0069007d-00ef-00cf-0061-003900bd0087.png",
        "timestamp": 1548337438172,
        "duration": 34408
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b64e4b477952ff2eaaffb02a3c853ef5",
        "instanceId": 52244,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548337632473,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548337633543,
                "type": ""
            }
        ],
        "screenShotFile": "00410043-0000-008f-005c-003100df0008.png",
        "timestamp": 1548337621105,
        "duration": 34683
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1cfb5f68c74a358c98390f15a0421c04",
        "instanceId": 49188,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548337967848,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548337969058,
                "type": ""
            }
        ],
        "screenShotFile": "00540019-002b-00f3-0074-003600bb0028.png",
        "timestamp": 1548337956217,
        "duration": 34703
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "f45ef0508619275ec0249b7bb22ead23",
        "instanceId": 43864,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548338447253,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548338448430,
                "type": ""
            }
        ],
        "screenShotFile": "00b400ba-007b-00e5-00c5-00e400200081.png",
        "timestamp": 1548338435960,
        "duration": 34371
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b413a0291517f883687fb4a72ab3e5b2",
        "instanceId": 50708,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:97:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548338821747,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548338822872,
                "type": ""
            }
        ],
        "screenShotFile": "008b002d-008a-00d3-0026-00c000ed0008.png",
        "timestamp": 1548338810695,
        "duration": 18888
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4dba9608af9f73768588e9621f154272",
        "instanceId": 54680,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:97:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548338969204,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548338971410,
                "type": ""
            }
        ],
        "screenShotFile": "001b0013-0017-0061-0070-00f600fe0014.png",
        "timestamp": 1548338958016,
        "duration": 19943
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "9e060f7bdefac32e47269bc9803d7792",
        "instanceId": 4204,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:97:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548840975160,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548840975890,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548840980108,
                "type": ""
            }
        ],
        "screenShotFile": "009200de-00b3-00ff-00ea-004100eb0021.png",
        "timestamp": 1548840962807,
        "duration": 20341
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ccd93c96b6673dbdc3838be9d29dba35",
        "instanceId": 28348,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841017899,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841018852,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548841019557,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841020078,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027018,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841027019,
                "type": ""
            }
        ],
        "screenShotFile": "00bf00db-0083-0001-0023-006d003a0074.png",
        "timestamp": 1548841016060,
        "duration": 10942
    },
    {
        "description": "check user name and password|Create a Project",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ffa9e771487f947c2538bc64242a1365",
        "instanceId": 21036,
        "browser": {
            "name": "chrome",
            "version": "71.0.3578.98"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"main\"]/div/div[1]/div[2]/div/div[2]/button)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"main\"]/div/div[1]/div[2]/div/div[2]/button)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:62:14)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"check user name and password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_CREATE_PROJECT.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841068493,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841069230,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548841070969,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841071878,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841075324,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841076448,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-white-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548841076448,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/api/project/?delivery_date=2019-01-30T09%3A37%3A00.000Z&title=12345&from_language=en&to_language=ar&domain=2&firstCreateEdit=1 - Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)",
                "timestamp": 1548841080912,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/js/app.js 0:1175811 Uncaught TypeError: Cannot read property 'data' of undefined",
                "timestamp": 1548841080912,
                "type": ""
            }
        ],
        "screenShotFile": "00970007-0008-00e7-00e6-00be0088000a.png",
        "timestamp": 1548841066630,
        "duration": 14349
    },
    {
        "description": "check user name and password|sign in test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "72d88485b8423b7114c783e7417af216",
        "instanceId": 31124,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Expected 'translation' to equal 'http://54.236.35.240/index.html#/vue/project'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\login_test.js:30:15)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919416019,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919416877,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548919417298,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919417693,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919424793,
                "type": ""
            }
        ],
        "screenShotFile": "00110091-0057-0069-0079-00bb005f0030.png",
        "timestamp": 1548919414539,
        "duration": 10247
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "7c0ebc8983901434a3f71f7f9189cf06",
        "instanceId": 20056,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919647827,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919648531,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548919648884,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919649280,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548919656159,
                "type": ""
            }
        ],
        "screenShotFile": "00a50008-00a7-001d-00a9-00110097005c.png",
        "timestamp": 1548919640819,
        "duration": 15324
    },
    {
        "description": "check user name and password|sign in test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cb1c81d569b46d1850b9c2a5acbcfc8d",
        "instanceId": 21144,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Expected 'http://54.236.35.240/index.html#/vue/project' to equal 'http://54ddddd.236.35.240/index.html#/vue/project'."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\login_test.js:28:34)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920316463,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920317269,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548920317965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920318319,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325209,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325209,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548920325209,
                "type": ""
            }
        ],
        "screenShotFile": "0044000c-00fa-00f7-0082-001500bb00f8.png",
        "timestamp": 1548920314978,
        "duration": 10211
    },
    {
        "description": "check user name and password|sign in test",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6523b8e7da4c187c44b010a4f5510ff0",
        "instanceId": 25156,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: elem is not defined"
        ],
        "trace": [
            "ReferenceError: elem is not defined\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\login_test.js:8:5\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:938:14\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous>\n    at pollCondition (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2195:19)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2191:7\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2190:22\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at thenableWebDriverProxy.wait (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\login_test.js:7:16)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"check user name and password\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\login_test.js:3:1)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\login_test.js:1:63)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548921142263,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548921143099,
                "type": ""
            }
        ],
        "screenShotFile": "00690004-002a-009d-004e-00ba00ad006c.png",
        "timestamp": 1548921140806,
        "duration": 2333
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "1b652ec6e38f0256503972d0e2b685b7",
        "instanceId": 27620,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: email.sendKeys is not a function"
        ],
        "trace": [
            "TypeError: email.sendKeys is not a function\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:68:15)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00020050-0010-0037-006b-00f400080099.png",
        "timestamp": 1548923180278,
        "duration": 15
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "628ac5d215dca0d98159ac982ba97afa",
        "instanceId": 26896,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:106:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548923280669,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548923281436,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548923282959,
                "type": ""
            }
        ],
        "screenShotFile": "0079001b-004c-00df-00a3-006f000b004d.png",
        "timestamp": 1548923269358,
        "duration": 18509
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "bac420ef863e59fe26b9ee8daa88e09e",
        "instanceId": 18772,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:107:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548923444360,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548923445093,
                "type": ""
            }
        ],
        "screenShotFile": "009e005d-0029-0020-0037-007600f0000a.png",
        "timestamp": 1548923433260,
        "duration": 18348
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4b1da6326fcc6486e38f691903cad5d1",
        "instanceId": 20432,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:107:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548923528200,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548923528936,
                "type": ""
            }
        ],
        "screenShotFile": "002b0000-00a0-0045-006f-00c400f30045.png",
        "timestamp": 1548923517007,
        "duration": 18810
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "300d2a8b03bb607c808387f793a9aa6e",
        "instanceId": 15052,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //*[@id=\"inbox-table\"]/tbody/tr/td[2]/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:107:17)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548928247128,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548928247946,
                "type": ""
            }
        ],
        "screenShotFile": "006a0040-0043-009f-0055-000b00060041.png",
        "timestamp": 1548928230147,
        "duration": 24472
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2a9f7c7d19ad928c81c9ea2b79beb4f4",
        "instanceId": 1480,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548932177017,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548932178140,
                "type": ""
            }
        ],
        "screenShotFile": "00fa0099-0097-0063-008f-00fe00df00dd.png",
        "timestamp": 1548932164581,
        "duration": 36844
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4abce5295440c501c03050d89f8eb7c6",
        "instanceId": 13212,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548932381440,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548932382383,
                "type": ""
            }
        ],
        "screenShotFile": "0070009a-0064-0043-00ba-00f800d40022.png",
        "timestamp": 1548932370015,
        "duration": 45323
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ae194edac5d8bd4908018ce15f7cc840",
        "instanceId": 3468,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548932445759,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548932446791,
                "type": ""
            }
        ],
        "screenShotFile": "00f5002c-00bf-0087-00b2-00aa00a5009a.png",
        "timestamp": 1548932434226,
        "duration": 45398
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b11ab4eaa4984e7b4d3e3e77f44ff8d5",
        "instanceId": 23772,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548932501018,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548932502174,
                "type": ""
            }
        ],
        "screenShotFile": "006c00d0-00c9-0033-00d6-00c100dc0062.png",
        "timestamp": 1548932489393,
        "duration": 46241
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "11b4405e2fe8a92d5346e412c2e968a3",
        "instanceId": 33080,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: str is not defined"
        ],
        "trace": [
            "ReferenceError: str is not defined\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:31:8)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00cc0084-006d-0031-003e-00e4005300d8.png",
        "timestamp": 1548932636525,
        "duration": 14
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "17329f05741bfbc962e389b36a086d7f",
        "instanceId": 24884,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548932695991,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548932697750,
                "type": ""
            }
        ],
        "screenShotFile": "00dd00cc-00c2-0087-00c8-00a200ef00db.png",
        "timestamp": 1548932684428,
        "duration": 46081
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c4d6f1974ad403d8847f16a08e23c5a8",
        "instanceId": 1840,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548932806534,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548932807720,
                "type": ""
            }
        ],
        "screenShotFile": "005300ee-00bd-0097-002a-00e9003e0016.png",
        "timestamp": 1548932794954,
        "duration": 45427
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c104a4cc73e8084895747d732e128119",
        "instanceId": 26300,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(partial link text, here)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(partial link text, here)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:115:5)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548933072531,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933073674,
                "type": ""
            }
        ],
        "screenShotFile": "00fa0059-00a2-0072-00b6-00000097004c.png",
        "timestamp": 1548933060791,
        "duration": 36307
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ce14c0c2fb8eb2978c9429c647405ad2",
        "instanceId": 22124,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(partial link text, here)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(partial link text, here)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:120:5)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548933195087,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933196241,
                "type": ""
            }
        ],
        "screenShotFile": "0014009f-00eb-0059-00b2-00710093002c.png",
        "timestamp": 1548933183663,
        "duration": 41003
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4877c7f853680e2f17f3516c85c6a5b8",
        "instanceId": 28824,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, /html/body/a)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, /html/body/a)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:120:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Check TMS EXECUTOR signup page\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:3:5)\n    at addSpecsToSuite (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\aloos\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\TMS_SIGNUP_EXECUTOR_TEST.js:1:5)\n    at Module._compile (internal/modules/cjs/loader.js:689:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:700:10)\n    at Module.load (internal/modules/cjs/loader.js:599:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:538:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548933302120,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933303320,
                "type": ""
            }
        ],
        "screenShotFile": "0033005d-0005-00a7-0049-00cf005100eb.png",
        "timestamp": 1548933289540,
        "duration": 43885
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "df6cae77e1b4ed9532d6158433cf557a",
        "instanceId": 24220,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548933825438,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933826713,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933869636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933869637,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933869637,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933869637,
                "type": ""
            }
        ],
        "screenShotFile": "00da0019-0025-00a0-00c3-00990047000f.png",
        "timestamp": 1548933813260,
        "duration": 56360
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "e172ba9e99dfc249766bd18cec23809f",
        "instanceId": 30764,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548933971844,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548933973244,
                "type": ""
            }
        ],
        "screenShotFile": "00d2009e-00ba-003f-008c-002100bd00da.png",
        "timestamp": 1548933959923,
        "duration": 52761
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6052d26da38a898f38a0943d43e67ec1",
        "instanceId": 364,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548934067077,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548934068985,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548934111587,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548934111587,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548934111587,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548934111587,
                "type": ""
            }
        ],
        "screenShotFile": "006500a0-007a-00ea-00ac-009e008c0080.png",
        "timestamp": 1548934054927,
        "duration": 56644
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "534e6f8d800eda5449a0154d06930012",
        "instanceId": 27932,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1548936861551,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548936862429,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548936903775,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548936903775,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548936903775,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1548936903775,
                "type": ""
            }
        ],
        "screenShotFile": "00870003-0028-0028-00cd-00cb00bb00c2.png",
        "timestamp": 1548936849865,
        "duration": 53891
    },
    {
        "description": "Check TMS EXECUTOR signup page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "f9b518e50bd0e53beb19490a57635835",
        "instanceId": 15044,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/register?type=EX - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1549103837005,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549103837979,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549103877635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549103877636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549103877636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/search.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549103877636,
                "type": ""
            }
        ],
        "screenShotFile": "00bf001a-00b9-0068-0002-00bd00160011.png",
        "timestamp": 1549103825929,
        "duration": 51693
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c4270e9f8190eb13e2247f29a9e5ff36",
        "instanceId": 9128,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198877418,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198878223,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1549198878749,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198879133,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549198889958,
                "type": ""
            }
        ],
        "screenShotFile": "001d00ca-006f-00a6-0024-005d00e2008a.png",
        "timestamp": 1549198875573,
        "duration": 14367
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "492716d7cfe229b58562ac3934fe7174",
        "instanceId": 10816,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200020469,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200021062,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1549200021525,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200021896,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029855,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200029856,
                "type": ""
            }
        ],
        "screenShotFile": "00560036-002c-00f9-0016-005500160080.png",
        "timestamp": 1549200018878,
        "duration": 10960
    },
    {
        "description": "check user name and password|sign in test",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "18feba34313af36b9c3bf3c2a8444e9f",
        "instanceId": 16660,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.81"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/landing/Vectorbody_left.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200477266,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/00.01/css/ajax-loader.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200478258,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://54.236.35.240/admin/login - This page includes a password or credit card input in a non-secure context. A warning has been added to the URL bar. For more information, see https://goo.gl/zmWq3m.",
                "timestamp": 1549200478936,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/favicon.png - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200479298,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240//favicon.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486723,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogo.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486725,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/assets/website/images/whiteLogoPart.png'%20%7C%20assetImage - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486725,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/down.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486726,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-checked.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486728,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/393839767_896803304my_image.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486728,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/upload_files/510961731_503449071jareertest.jpg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486728,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/scroll.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486728,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://54.236.35.240/img/icons/check-empty.svg - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1549200486728,
                "type": ""
            }
        ],
        "screenShotFile": "00b40036-00e1-0038-00a3-00f400dd00ae.png",
        "timestamp": 1549200475668,
        "duration": 11038
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

