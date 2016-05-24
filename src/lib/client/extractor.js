const RuleSchema = {
    extractor : {
        slim : ["k1", "v1", "k2", "v2", "k3", "v3"],
        full : [
            {
                "name": "entity-source",
                "cssPath": ".entity-source",
                "validator": {
                    "regex": ".+",
                    "xpath": null
                },
                "min-left": null,
                "max-left": null,
                "min-top": null,
                "max-top": null,
                "min-width": null,
                "max-width": null,
                "min-height": null,
                "max-height": null
            }
        ],
        kv : [
            {
                "name": "publication",
                "container": ".entity-section div",
                "key": " > span",
                "value": " > p"
            }
        ]
    }
};

/**
 * Page extractor
 * @param  HTMLElement|null  options     extract rules
 * */
var Extractor = function Extractor(extractor) {
    "use strict";
    
    this.extractor = extractor;
    this.results = [];
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  HTMLElement|null  scope     Element to search child elements within,
 *  default scope is window.document
 * @return
 * */
Extractor.prototype.extract = function(scope) {
    "use strict";
    var rules = this.extractor.slim;
    if (rules && rules.length % 2 !== 0) {
        throw new Error("Slim extractor rules length should be an even number");
        return;
    }

    scope = scope || window.document;
    
    try {
        this.extractBySlimRules(scope);
        this.extractByFullRules(scope);
        this.extractByKVRules(scope);
    }
    catch (e) {
        __utils__.log(e, "error");
    }
    return this.results;
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  HTMLElement|null  scope     Element to search child elements within, 
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractBySlimRules = function(scope) {
    "use strict";
    var rules = this.extractor.slim;
    if (!rules) {
        return;
    }
    if (rules.length % 2 !== 0) {
        __utils__.log('Slim extractor rules length must be even number', 'warn');
        return;
    }

    for (var i = 0; i < rules.length - 1; i += 2) {
        var k = rules[i];
        var selector = rules[i + 1];
        var v = __utils__.findOne(selector, scope);

        if (v && v.textContent) {
            this.results.push([k, v.textContent]);
        }
    }
};

/**
 * Extract fields from an element using the given regex rule
 *
 * @param HTMLElement|null scope Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByRegex = function(rule, scope) {
    "use strict";
    for (var i = 0; i < rule.length; ++i) {
        this.extractByOneRegex(rule[i]);
    }
};

/**
 * Extract fields from an element using the given regex rule
 *
 * @param HTMLElement|null scope Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByOneRegex = function(rule, scope) {
    "use strict";
    if (!rule.regex) {
        throw new Error("Invalid rule");
        return;
    }
    
    if (!scope) {
        scope = document;
    }

    var k = rule.name;
    var v = null;
    var regex = new RegExp(rule.regex);
    
    var nodeList = scope.querySelectorAll("*");
    for (var i = 0; i < nodeList.length; ++i) {
        var node = nodeList.item(i);

        if (["DIV", "A", "UI", "DL", "H1", "H2", "H3", "H4"].indexOf(node.tagName) == -1) {
            continue;
        }

        // if (node.textContent.indexOf("年份") !== -1) {
        //     __utils__.echo(rule.regex);
        //     __utils__.echo(regex);
        //     __utils__.echo(node.textContent);
        // }

        if (node.textContent && node.textContent.match(regex)) {
            v = node;
        }
    }

    if (k && v) {
        this.results.push([k, v.textContent]);
    }
};

/**
 * Extract fields from an element using the given vision rule
 *
 * @param  HTMLElement|null  scope     Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByVision = function(rule, scope) {
    var k = rule.name;
    var v = null;

    var nodeList = scope.querySelectorAll("*");
    for (var i = 0; i < nodeList; ++i) {
        var v = nodeList[i];
        if (v && v.textContent) {
            var vision = v.getAttribute("vi");
            var match = true;
            for (var i = 0; i < 4; ++i) {
                match = (vision[i] >= rule.vision.min[i]) && (vision[i] <= rule.vision.max[i]);
                if (!match) break;
            }
            if (match) {
                this.results.push([k, v.textContent]);
            }
        }
    }
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  Object  rule     Extract rule
 * @param  HTMLElement|null  scope     Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByFullRule = function(rule, scope) {
    "use strict";

    if (!rule.name || !rule.cssPath) {
        __utils__.log('Full extract rule must have fields name and cssPath', 'warn');
        return;
    }

    var k = rule.name;
    var v = null;
    if (rule.cssPath) {
        v = __utils__.findOne(rule.cssPath, scope);
    }
    if (!v && rule.xpath) {
        v = __utils__.findOne(rule.xpath, scope);
    }
    if (!v && rule.regex) {
        this.extractByRegex(rule, scope);
    }
    if (!v && rule.vision) {
        this.extractByVision(rule, scope);
    }

    if (!v || !v.textContent) {
        return;
    }

    var validateRate = 0.1;
    if (1 < validateRate) {
        // TODO : use a mechanism to validate some of the samples
        return;
    }

    var valid = false;
    if (rule.validator.cssPath) {
        var v2 = __utils__.findOne(rule.validator.xpath, scope);
        valid = (v.textContent == v2.textContent);
    }
    if (rule.validator.xpath) {
        var v2 = __utils__.findOne(rule.validator.xpath, scope);
        valid = (v.textContent == v2.textContent);
    }
    if (rule.validator.regex) {
        valid = v.textContent.match(new RegExp(rule.validator.regex));
    }
    if (rule.validator.vision) {
    }

    if (valid) {
        this.results.push([k, v.textContent]);
    }
};

/**
 * Extract fields from an element using the given rules
 *
 * @param  HTMLElement|null  scope     Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByFullRules = function(scope) {
    "use strict";

    var rules = this.extractor.full;
    if (!rules) {
        return;
    }

    if (!Array.isArray(rules)) {
        var tmp = [].push(rules);
        rules = tmp;
    }

    for (var i = 0; i < rules.length; ++i) {
        var rule = rules[i];
        this.extractByFullRule(rule, scope);
    }
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  HTMLElement|null  scope     Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByKVRules = function(scope) {
    "use strict";

    var rules = this.extractor.kv;
    if (!rules) {
        return;
    }

    var type = typeof rules;

    if (type === 'object') {
        var tmp = [].push(rules);
        rules = tmp;
    }

    if (!Array.isArray(rules)) {
        throw new Error("Unsupported rules type: " + (typeof rules));
    }
};
