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

// Note : seems can not come before constants
"use strict";

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
            this.results.push([k, v.textContent.trim()]);
        }
    }
    
    return this.results;
};

/**
 * Extract fields from an element using the given regex rule
 *
 * @param {Array|null} extract rules
 * @param {HTMLElement|null} scope Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByRegex = function(rules, scope) {
    for (var i = 0; i < rules.length; ++i) {
        this.extractByOneRegex(rules[i]);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given regex rule.
 * The target string is split into groups by rule.regex and the specified group is choosed to be the extract result value.
 *
 * @param {Object|null} extract rule
 *  rule.name : the field name
 *  rule.regex : the regex to split the target string into groups
 *  rule.group : the group number in regex match result, by default, group number is 0 which means the entire string,
 *      if group number is not valid, for example, out of range, it's set to be 0.
 * @param {HTMLElement|null} scope Element to search child elements within,
 *  default scope is document
 * @return {Array}
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
    var groupNum = rule.group || 0; // regex group to extract as the result value, 0 means the entire string

    var treeWalker = document.createTreeWalker(
        scope,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode : function(node) { return NodeFilter.FILTER_ACCEPT; }
        },
        false
    );

    while(treeWalker.nextNode()) {
        var node = treeWalker.currentNode;

        if (["DIV", "IMG", "A", "UI", "DL", "H1", "H2", "H3", "H4"].indexOf(node.tagName) == -1) {
            continue;
        }

        // ignore layout nodes
        var descends = __qiwur_getAttributeAsInt(node, "data-descend", 0);
        if (descends > 10) {
            continue;
        }
        
        var content = this.getTextContent(node);
        if (!content) {
            continue;
        }

        if (content.indexOf("年份") !== -1) {
            // this.debugContent(node);
        }

        var groups = content.match(regex);
        if (!groups) {
            continue;
        }

        if (groupNum < 0 || groupNum > groups.length) {
            groupNum = 0;
        }

        v = node;
        content = groups[groupNum];
        this.results.push([k, content.trim()]);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given vision rule
 *
 * @param rules {Object|null} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return {Array}
 * */
Extractor.prototype.extractByVision = function(rules, scope) {
    for (var i = 0; i < rules.length; ++i) {
        this.extractByOneVision(rules[i]);
    }
    
    return this.results;
};

/**
 * Extract fields from an element using the given vision rule
 *
 * @param rule {Object|null} extract rule
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return {Array}
 * */
Extractor.prototype.extractByOneVision = function(rule, scope) {
    "use strict";

    if (!rule || !rule.name || !rule.vision) {
        throw new Error("Invalid rule");
        return;
    }

    if (!scope) {
        scope = document;
    }

    var k = rule.name;
    var v = null;

    var treeWalker = document.createTreeWalker(
        scope,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode : function(node) { return NodeFilter.FILTER_ACCEPT; }
        },
        false
    );

    while(treeWalker.nextNode()) {
        var node = treeWalker.currentNode;

        // Only block element is considered, this might be refined to add more tags
        if (["DIV", "IMG", "A", "UI", "DL", "H1", "H2", "H3", "H4"].indexOf(node.tagName) == -1) {
            continue;
        }

        // ignore layout nodes
        var descends = __qiwur_getAttributeAsInt(node, "data-descend", 0);
        if (descends > 10) {
            continue;
        }

        var content = this.getTextContent(node);
        if (!content) {
            continue;
        }

        if (content.indexOf("年份") !== -1) {
            // this.debugContent(node);
        }

        var vision = node.getAttribute("vi");
        if (!vision) {
            continue;
        }

        // convert string to array, for example, "100 100 100 100" => ["100", "100", "100", "100"]
        vision = vision.split(" ");
        if (vision.length !== 4) {
            continue;
        }

        var match = true;
        var visionRule = rule.vision;
        for (var i = 0; i < 4; ++i) {
            if (!vision[i] || !visionRule.min[i] || !visionRule.max[i]) {
                match = false;
                break;
            }

            // explicitly convert string to integer before comparison
            vision[i] = parseInt(vision[i]);

            // var name = __qiwur_getReadableNodeName(node);
            // __utils__.echo(name + " : " + vision[i] + ", "
            //     + visionRule.min[i] + ", " + visionRule.max[i]);

            match = (vision[i] >= visionRule.min[i]) && (vision[i] <= visionRule.max[i]);

            // check the next node
            if (!match) {
                break;
            }
        }

        if (match) {
            v = node;
            this.results.push([k, content]);
        }
    } // while

    return this.results;
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  rule {Object} Extract rule
 * @param  scope {HTMLElement|null} Element to search child elements within,
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

    var content = this.getTextContent(v);
    if (!content) {
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
        valid = (content == v2.textContent.trim());
    }
    if (rule.validator.xpath) {
        var v2 = __utils__.findOne(rule.validator.xpath, scope);
        valid = (content == v2.textContent.trim());
    }
    if (rule.validator.regex) {
        valid = content.match(new RegExp(rule.validator.regex));
    }
    if (rule.validator.vision) {
    }

    if (valid) {
        this.results.push([k, content]);
    }

    return this.results;
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
 * @param  scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return
 * */
Extractor.prototype.extractByKVRules = function(scope) {
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

    return this.results;
};

/**
 * Clean element's textContent
 * @param textContent {String} the string to clean
 * @return The clean string
 * */
Extractor.prototype.cleanTextContent = function(textContent) {
    textContent = textContent.replace(/\s+/g, " "); // combine all blanks into one " " character
    return textContent.trim();
};

/**
 * Get cleared element's textContent
 * @param content {String} the string to clean
 * @return {String} The cleared string, "" if no element text content available.
 * */
Extractor.prototype.getTextContent = function(node) {
    if (!node || !node.textContent) {
        return "";
    }

    var content = this.cleanTextContent(node.textContent);

    return content;
};

Extractor.prototype.debugContent = function(scope) {
    var content = scope.textContent.trim();
    // content = content.replace(/\n/g, "");

    __utils__.echo("-------------debug content-----------------");
    var s = "";
    for (var i = 0; i < content.length; ++i) {
        s += content.charAt(i) + content.charCodeAt(i) + ",";
    }
    __utils__.echo(s);
    __utils__.echo("-------------debug content-----------------");
};

