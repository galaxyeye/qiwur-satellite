// Extractor Rule Example
const ExtractorRuleTemplate = {
    slim: ["k1", "v1", "k2", "v2", "k3", "v3"],
    full: [
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
    kv: [
        {
            "name": "publication",
            "container": ".entity-section div",
            "key": " > span",
            "value": " > p"
        }
    ]
};

// Note : seems can not come before constants
"use strict";

/**
 * Page extractor
 * @param extractor {JSON} extract rules
 * @param options {Object}
 * */
var WarpsDomExtractor = function Extractor(extractor, options) {
    "use strict";

    if (!options) {
        options = {};
    }

    this.defaults = {
        'verbose' : false
    };
    /** Extract rules */
    this.extractor = extractor;
    /** Extract options */
    this.options = __warps__mergeObjects(this.defaults, options, null);
    /** Extract rules */
    this.verbose = this.options.verbose;
    /**
     * @var results array [[k1, v1], [k1, v1], ..., [kn, vn]]
     * */
    this.results = [];
};

/**
 * Extract fields from an element using the given rule
 *
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is window.document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extract = function (scope) {
    "use strict";

    if (this.verbose) {
        __utils__.log('WarpsDomExtractor extract', 'debug');
    }

    scope = scope || window.document;

    try {
        if (this.extractor.slim) {
            this.extractBySlimRules(this.extractor.slim, scope);
        }
        if (this.extractor.full) {
            this.extractByFullRules(this.extractor.full, scope);
        }
        if (this.extractor.kv) {
            this.extractByKVRules(this.extractor.kv, scope);
        }
        if (this.extractor.regex) {
            this.extractByRegex(this.extractor.regex, scope);
        }
        if (this.extractor.collection) {
            this.extractCollections(this.extractor.collection, scope);
        }
    }
    catch (e) {
        __utils__.log("Failed to extract page. " + e, "error");
    }

    return this.results;
};

/**
 * Extract fields from an element using the given rules
 *
 * @param rules {Array|null} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractBySlimRules = function (rules, scope) {
    "use strict";

    if (this.verbose) {
        __utils__.log('Extract by slim rules', 'debug');
    }

    if (!rules) {
        return this.results;
    }

    if (rules.length % 2 !== 0) {
        __utils__.log('Slim extractor rules length must be even number', 'warn');
        return this.results;
    }

    for (var i = 0; i < rules.length - 1; i += 2) {
        var k = rules[i];
        var selector = rules[i + 1];
        var v = __utils__.findOne(selector, scope);

        if (v && v.textContent) {
            var item = {name : k, value : __warps_getMergedTextContent(v)};
            this.results.push(item);
        }
    }

    return this.results;
};

/**
 * Extract fields from an element using the given regex rule
 *
 * @param rules {Array|null} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByRegex = function (rules, scope) {
    "use strict";

    if (this.verbose) {
        __utils__.log('Extract by regex', 'debug');
    }

    for (var i = 0; i < rules.length; ++i) {
        this.extractByOneRegex(rules[i], scope);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given regex rule.
 * The target string is split into groups by rule.regex and the specified group is choosed to be the extract result value.
 *
 * @param {Object|null} rule extract rule
 *  rule.name : the field name
 *  rule.regex : the regex to split the target string into groups
 *  rule.group : the group number in regex match result, by default, group number is 0 which means the entire string,
 *      if group number is not valid, for example, out of range, it's set to be 0.
 * @param {HTMLElement|null} scope Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByOneRegex = function (rule, scope) {
    "use strict";

    if (this.verbose) {
        __utils__.log('Extract by one regex', 'debug');
    }

    if (!rule.name || !rule.container || !rule.regex || !rule.group) {
        throw new Error("Invalid regex rule " + JSON.stringify(rule));
    }

    // TODO : scope is useless, use rule.container instead
    if (!scope) {
        scope = document;
    }

    scope = __utils__.findOne(rule.container);

    var k = rule.name;
    var v = null;
    var regex = new RegExp(rule.regex);
    var groupNum = rule.group || 0; // regex group to extract as the result value, 0 means the entire string

    var treeWalker = document.createTreeWalker(
        scope,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: function (node) {
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    while (treeWalker.nextNode()) {
        var node = treeWalker.currentNode;

        if (["DIV", "IMG", "A", "UI", "DL", "H1", "H2", "H3", "H4"].indexOf(node.tagName) == -1) {
            continue;
        }

        // ignore layout nodes
        var descends = __warps_getAttributeAsInt(node, "data-descend", 0);
        if (descends > 10) {
            continue;
        }

        var content = __warps_getMergedTextContent(node);
        if (!content) {
            continue;
        }

        if (content.indexOf(k) !== -1) {
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
        content = groups[groupNum].trim();
        if (content.length > 0) {
            var item = {name : k, value : content};
            this.results.push(item);
        }
    } // while

    return this.results;
};

/**
 * Extract fields from an element using css selector or xpath
 *
 * @param rules {Array|null} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return {Array}
 * */
WarpsDomExtractor.prototype.extractBySelector = function (rules, scope) {
    "use strict";
    
    if (this.verbose) {
        __utils__.log('Extract by selector', 'debug');
    }

    for (var i = 0; i < rules.length; ++i) {
        this.extractByOneSelector(rules[i], scope);
    }

    return this.results;
};

/**
 * Extract fields from an element using css selector or xpath
 *
 * @param rules {Array|null} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByOneSelector = function (rule, scope) {
    "use strict";
    
    if (this.verbose) {
        __utils__.log('Extract by one selector', 'debug');
    }

    if (!rule.name || !rule.selector) {
        __utils__.log('Invalid rule', 'warn');
        return this.results;
    }

    var k = rule.name;
    var v = __utils__.findAll(rule.selector, scope);

    if (rule.debug) {
        this.__debugContent(rule.key, rule.value, node);
    }

    if (k && v) {
        var item = {name : k, value : __warps_getMergedTextContent(v)};
        this.results.push(item);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given vision rules
 *
 * @param rules {Array} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByVision = function (rules, scope) {
    // "use strict";
    //
    // __utils__.log('Extract by vision', 'debug');

    for (var i = 0; i < rules.length; ++i) {
        this.extractByOneVision(rules[i], scope);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given vision rule
 *
 * @param rule {Object|null} extract rule
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByOneVision = function (rule, scope) {
    // "use strict";
    //
    // __utils__.log('Extract by one vision', 'debug');

    if (!rule || !rule.name || !rule.vision) {
        throw new Error("Invalid rule");
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
            acceptNode: function (node) {
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    while (treeWalker.nextNode()) {
        var node = treeWalker.currentNode;

        // Only block element is considered, this might be refined to add more tags
        const TAGS = ["DIV", "IMG", "A",
            "UL", "OL", "LI",
            "DL",
            "TABLE", "TBODY", "TR",
            "H1", "H2", "H3", "H4"];
        if (TAGS.indexOf(node.tagName) == -1) {
            continue;
        }

        // ignore layout nodes
        var descends = __warps_getAttributeAsInt(node, "data-descend", 0);
        if (descends > 10) {
            continue;
        }

        var content = __warps_getMergedTextContent(node);
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

            // var name = __warps_getReadableNodeName(node);
            // __utils__.echo(name + " : " + vision[i] + ", "
            //     + visionRule.min[i] + ", " + visionRule.max[i]);

            match = (vision[i] >= visionRule.min[i]) && (vision[i] <= visionRule.max[i]);

            // check the next node
            if (!match) {
                break;
            }
        } // for

        if (match) {
            var item = {name : k, value : content};
            this.results.push(item);
        }
    } // while

    return this.results;
};

/**
 * Extract fields from an element using the given rules
 *
 * @param rules {Array|null} extract rules
 * @param scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByFullRules = function (rules, scope) {
    // "use strict";
    //
    // __utils__.log('Extract by full rules', 'debug');

    if (!rules) {
        return this.results;
    }

    if (!Array.isArray(rules)) {
        var tmp = [].push(rules);
        rules = tmp;
    }

    for (var i = 0; i < rules.length; ++i) {
        var rule = rules[i];
        this.extractByFullRule(rule, scope);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  rule {Object} Extract rule
 * @param  scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractByFullRule = function (rule, scope) {
    "use strict";

    __utils__.log('Extract by full rule', 'debug');

    if (rule.selector) {
        this.extractBySelector(rule, scope);
    }
    if (rule.regex) {
        this.extractByRegex(rule, scope);
    }
    if (rule.vision) {
        this.extractByVision(rule, scope);
    }
    if (rule.kv) {
        this.extractByOneKVRule(rule, scope);
    }

    // var validateRate = 0.1;
    // if (1 < validateRate) {
    //     // TODO : use a mechanism to validate some of the samples
    //     return this.results;
    // }

    // var resultNotValidated = this.results;
    // this.results = [];

    // var valid = false;
    // if (rule.validator.selector) {
    //     var v2 = __utils__.findOne(rule.validator.xpath, scope);
    //     valid = (content == v2.textContent.trim());
    // }
    // if (rule.validator.regex) {
    //     valid = content.match(new RegExp(rule.validator.regex));
    // }
    // if (rule.validator.vision) {
    // }
    //
    // if (valid) {
    //     this.results.push([k, content]);
    // }

    return this.results;
};

/**
 * Extract fields from an element using the given rules
 *
 * @param rules {Array|null} extract rules
 * @param  scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return {Array}
 * */
WarpsDomExtractor.prototype.extractByKVRules = function (rules, scope) {
    // "use strict";
    //
    // __utils__.log('Extract by KV rules', 'debug');

    for (var i = 0; i < rules.length; ++i) {
        this.extractByOneKVRule(rules[i], scope);
    }

    return this.results;
};


/**
 * Extract fields from an element using the given rule
 *
 * @param rule {Object|null} extract rule
 * @param  scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return {Array}
 * */
WarpsDomExtractor.prototype.extractByOneKVRule = function (rule, scope) {
    "use strict";

    __utils__.log('Extract by one KV rule', 'debug');

    if (!rule || !rule.collection || !rule.key || !rule.value) {
        throw new Error("Invalid extract rule : " + JSON.stringify(rule));
    }

    if (!scope) {
        scope = document;
    }

    var nodeList = __utils__.findAll(rule.collection, scope);
    for (var i = 0; i < nodeList.length; ++i) {
        var node = nodeList[i];

        var k = __utils__.findAll(rule.key, node);
        var v = __utils__.findAll(rule.value, node);

        if (rule.debug) {
            this.__debugContent(rule.key, rule.value, node);
        }

        k = __warps_getMergedTextContent(k);
        v = __warps_getMergedTextContent(v);
        if (k && k.length > 0 && v && v.length > 0 ) {
            var item = {name : k, value : v};
            this.results.push(item);
        }
    }

    return this.results;
};

/**
 * Extract fields from an element using the given rules
 *
 * @param rules {Array|null} extract rules
 * @param  scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return {Array}
 * */
WarpsDomExtractor.prototype.extractCollections = function (rules, scope) {
    "use strict";

    __utils__.log('Extract by collections', 'debug');

    for (var i = 0; i < rules.length; ++i) {
        this.extractCollection(rules[i], scope);
    }

    return this.results;
};

/**
 * Extract fields from an element using the given rule
 *
 * @param  rule {Object} Extract rule
 * @param  scope {HTMLElement|null} Element to search child elements within,
 *  default scope is document
 * @return array contains [k, v] pairs
 * */
WarpsDomExtractor.prototype.extractCollection = function (rule, scope) {
    "use strict";

    __utils__.log('Extract collection', 'debug');

    if (!rule || !rule.name || !rule.container || !rule.collection) {
        throw new Error("Invalid extract rule : " + JSON.stringify(rule));
    }

    if (!scope) {
        scope = document;
    }

    // var containerNode = __utils__.findOne(rule.container, scope);
    // var k = rule.name;
    var nodeList = __utils__.findAll(rule.collection, scope);
    if (!nodeList) {
        __utils__.log('Find nothing with selector ' + rule.container + ' ' + rule.collection, 'warning');
        return this.results;
    }

    var name = rule.name;
    var entities = [];
    for (var i = 0; i < nodeList.length; ++i) {
        var node = nodeList[i];
        entities = new WarpsDomExtractor(rule.extractor).extract(node);
        
        // __utils__.log(node.textContent);

        // var k = __utils__.findAll(rule.key, node);
        // var v = __utils__.findAll(rule.value, node);
        //
        // if (rule.debug) {
        //     this.__debugContent(rule.key, rule.value, node);
        // }
        //
        // if (k && v) {
        //     entities.push([__warps_getMergedTextContent(k), __warps_getMergedTextContent(v)]);
        // }
    }
    // this.results.push([name, entities, "collection"]);
    var item = {name : name, value : entities, type : "collection"};
    this.results.push(item);

    return this.results;
};

/**
 * Validate
 * */
WarpsDomExtractor.prototype.validate = function () {
    // "use strict";

    __utils__.log('Validate', 'debug');
};

WarpsDomExtractor.prototype.__debugContent = function (ruleKey, ruleValue, scope) {
    // "use strict";

    var k = __utils__.findAll(ruleKey, scope);
    var v = __utils__.findAll(ruleValue, scope);

    __utils__.echo(i + " : " +
        __warps_getReadableNodeName(scope) +
        ", " + ruleKey +
        ", " + ruleValue +
        ", " + (k ? __warps_getMergedTextContent(k) : "") +
        " : " + (v ? __warps_getMergedTextContent(v) : "")
    );
};
