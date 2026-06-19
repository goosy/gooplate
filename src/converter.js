/**
 * @file Implements template conversion based on conversion rules
 * @author goosy.jo@gmail.com
 * @typedef {Object.<string, Object>} Tags  tag and value dict
 * @typedef {{name:string, tags:Tags}} Rule Conversion rule
 * @typedef {Rule[]} Rules Conversion rule table
 */

import { parse_to_dom } from "./gooparse.js";

/**
 * @param {Tags} tags tags dict for template
 * @param {string} template template string
 * @return {string}
 */
export function convert(tags, template) {
    return convert_dom(tags, parse_to_dom(template));
}

/**
 * @param {Rules} rules
 * @param {string} template
 * @return {Array.<{"name": string, "content": string}>}
 */
export function convert_rules(rules, template) {
    return rules.map(rule => ({
        name: rule.name,
        content: convert(rule.tags, template)
    }));
}

function parse_member_expression(tags, es_expression) {
    const obj = compute_es_expression(tags, es_expression.object);
    const property = es_expression.computed ?
        compute_es_expression(tags, es_expression.property) :
        es_expression.property.name;
    return { obj, property };
}

const global_tags = {
    *range(...argus) {
        let [start, end, step] = argus;
        if (start === undefined) return;
        if (end === undefined) {
            end = start
            start = 0
        }
        const direct = start < end;
        step ??= direct ? 1 : -1;
        let index = start;
        while (direct === (index < end)) {
            yield index;
            index += step;
        }
    },
    stepper(init_value = 0, step = 1) {
        let v = init_value;
        return {
            get value() {
                return v;
            },
            next() {
                v += step;
                return '';
            },
        }
    },
    Object, Array, Map, Set, // Transparently transmit some system objects
}

/**
 * Recursively evaluate expressions
 * @param {Object} tags tag and value dict
 * @param {AST} es_expression
 * @return {*}
 */
function compute_es_expression(tags, es_expression) {
    // 'Identifier' 'AssignmentExpression' 'BinaryExpression' 'Literal'
    if (es_expression.type === "Literal") return es_expression.value;
    if (es_expression.type === "Identifier") {
        return { ...global_tags, ...tags }[es_expression.name]; // The identifier must be in tags, otherwise undefined is returned
    }

    // obj.foo
    if (es_expression.type === "MemberExpression") {
        const { obj, property } = parse_member_expression(tags, es_expression);
        return obj[property];
    }

    // obj?.foo
    if (es_expression.type === "ChainExpression") {
        const { obj, property } = parse_member_expression(tags, es_expression.expression);
        if (obj === null || obj === undefined) return undefined;
        return obj[property];
    }

    // +expr -expr ~expr !expr
    if (es_expression.type === 'UnaryExpression') {
        const result = compute_es_expression(tags, es_expression.argument);
        if (es_expression.operator === '+') return +result;
        if (es_expression.operator === '-') return -result;
        if (es_expression.operator === '~') return ~result;
        if (es_expression.operator === '!') return !result;
    }

    // expr1 operator expr2
    if (
        es_expression.type === 'BinaryExpression' ||
        es_expression.type === 'LogicalExpression'
    ) {
        const left = compute_es_expression(tags, es_expression.left);
        const right = compute_es_expression(tags, es_expression.right);
        switch (es_expression.operator) {
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '*':
                return left * right;
            case '/':
                return left / right;
            case '%':
                return left % right;
            case '==':
                // biome-ignore lint/suspicious/noDoubleEquals: This is the interpreter
                return left == right;
            case '===':
                return left === right;
            case '!=':
                // biome-ignore lint/suspicious/noDoubleEquals: This is the interpreter
                return left != right;
            case '!==':
                return left !== right;
            case '??':
                return left ?? right;
            case 'in':
                return left in right;
            case '<':
                return left < right;
            case '>':
                return left > right;
            case '<=':
                return left <= right;
            case '>=':
                return left >= right;
            case '||':
                return left || right;
            case '&&':
                return left && right;
        }
    }

    // expr1, expr2, ..., exprN
    if (es_expression.type === 'SequenceExpression') {
        return es_expression.expressions.reduce(
            (str, exp) => str + compute_es_expression(tags, exp),
            ""
        );
    }

    // expr1 ? expr2 : expr3
    if (es_expression.type === 'ConditionalExpression') {
        const test = compute_es_expression(tags, es_expression.test);
        const consequent = compute_es_expression(tags, es_expression.consequent);
        const alternate = compute_es_expression(tags, es_expression.alternate);
        return test ? consequent : alternate;
    }

    // expr1 = expr2
    // expr1 += expr2
    // expr1 -= expr2
    // expr1 *= expr2
    // expr1 **= expr2
    // expr1 /= expr2
    // expr1 %= expr2
    // expr1 &&= expr2
    // expr1 ||= expr2
    // expr1 ??= expr2
    if (
        es_expression.type === 'AssignmentExpression'
    ) {
        const left = es_expression.left.name;
        const right = compute_es_expression(tags, es_expression.right);
        switch (es_expression.operator) {
            case '=':
                tags[left] = right;
                return "";
            case '+=':
                tags[left] += right;
                return "";
            case '-=':
                tags[left] -= right;
                return "";
            case '*=':
                tags[left] *= right;
                return "";
            case '**=':
                tags[left] **= right;
                return "";
            case '/=':
                tags[left] /= right;
                return "";
            case '%=':
                tags[left] %= right;
                return "";
            case '&&=':
                tags[left] &&= right;
                return "";
            case '||=':
                tags[left] ||= right;
                return "";
            case '??=':
                tags[left] ??= right;
                return "";
        }
    }

    // foo() obj.foo() obj["foo"]()
    if (es_expression.type === "CallExpression") {
        const argus = [];
        for (const argu of es_expression.arguments) {
            if (argu.type === "SpreadElement") {
                argus.push(...compute_es_expression(tags, argu.argument));
            } else {
                argus.push(compute_es_expression(tags, argu));
            }
        }
        const callee = es_expression.callee;
        if (callee.type === "Identifier") {
            return compute_es_expression(tags, callee)(...argus);
        }
        if (callee.type === "MemberExpression") {
            const { obj, property } = parse_member_expression(tags, callee);
            return obj[property](...argus);
        }
        return '';
    }

    // [expr1, expr2, ...]
    if (es_expression.type === "ArrayExpression") {
        const ret = [];
        for (const el of es_expression.elements) {
            if (el.type === "SpreadElement") {
                ret.push(...compute_es_expression(tags, el.argument));
            } else {
                ret.push(compute_es_expression(tags, el));
            }
        }
        return ret;
    }

    // {a: expr1, expr2, ...expr3}
    if (es_expression.type === "ObjectExpression") {
        const ret = {};
        for (const prop of es_expression.properties) {
            if (prop.type === "SpreadElement") {
                Object.assign(ret, compute_es_expression(tags, prop.argument));
            }
            if (prop.type === "Property") {
                const key = prop.computed
                    ? compute_es_expression(tags, prop.key)
                    : prop.key.name;
                const value = compute_es_expression(tags, prop.value);
                ret[key] = value;
            }
        }
        return ret;
    }

    // throw error in other cases
    throw Error(`not expression: "${es_expression}"`);
}

function convert_for_goonode(tags, node) {
    let key;
    let value;
    let iterable;
    let content = '';
    const left = node.expression.left;
    const right = compute_es_expression(tags, node.expression.right);
    if (!right) throw Error("wrong for statement!");
    const is_array = Array.isArray(right);
    const is_iterable = right != null && typeof right[Symbol.iterator] === 'function';
    // {{for v in object}}
    if (left.type === 'Identifier') {
        value = left.name;
        iterable = is_iterable ? right : Object.values(right);
        const original = value in tags ? tags[value] : undefined;
        for (const item of iterable) {
            tags[value] = item;
            content += convert_dom(tags, node);
        }
        if (original === undefined) delete tags[value];
        else tags[value] = original;
        return content;
    }
    // {{for k, v in object}}
    if (left.type === "ArrayExpression") {
        key = left[0].name;
        value = left[1].name;
        iterable = Object.entries(is_iterable ? [...right] : right);
        const original_key = key in tags ? tags[key] : undefined;
        const original_value = value in tags ? tags[value] : undefined;
        for (let [k, v] of iterable) {
            k = is_array ? Number.parseInt(k) : k;
            tags[key] = k;
            tags[value] = v;
            content += convert_dom(tags, node);
        }
        if (original_key === undefined) delete tags[key];
        else tags[key] = original_key;
        if (original_value === undefined) delete tags[value];
        else tags[value] = original_value;
        return content;
    }
    throw Error("wrong for statement!");
}

function convert_if_goonode(tags, node) {
    const truenode = node.contents.find(node => {
        if (node.type === "if" || node.type === "elseif") { // After node.text conversion evaluation, decide whether to render the if body
            return compute_es_expression(tags, node.expression);
        }
        if (node.type === "else") return true;
        return false;
    });
    if (truenode) {
        return convert_dom(tags, truenode);
    }
    return "";
}

/**
 * Convert goonode DOM to text
 * @param {Object} tags
 * @param {Goonode} dom
 * @returns {string}
 */
function convert_dom(tags, dom) {
    let content = '';
    for (const node of dom.contents) {
        if (node.type === "raw") {
            content += node.text;
        } else if (node.type === "expression") {
            content += compute_es_expression(tags, node.expression);
        } else if (node.type === "ifs") {
            content += convert_if_goonode(tags, node);
        } else if (node.type === "for") {
            content += convert_for_goonode(tags, node);
        }
    }
    return content;
}
