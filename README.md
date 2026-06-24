# Template Substitution

## Installation

- node:
  `pnpm add gooplate`
- deno:
  `deno add jsr:@fdcn/gooplate`

## Usage & Example

```javascript
import { convert } from "gooplate";
const tags = {
  name: "GD8",
  ID: 8078,
  peoples: [
    { name: "Alice",   age: 15 },
    { name: "Bob",     age: 22 },
    { name: "Carol",   age: 19 },
    { name: "Dave",    age: 29 },
  ],
};
const template = `group: {{name}}{{ID = ID-8000 }}{{// note: use last 2 digits of ID as the number}}
ID: {{ID}}
people:{{for people in peoples}}_
{{  if people.age > 18}}
- {{people.name}}_
{{  endif}}_
{{endfor}}
`;
console.log(convert(tags, template));
```

Output:

```plaintext
group: GD8
ID: 78
people:
- Bob
- Carol
- Dave
```

To apply multiple conversion rules, use the `convert_rules` function — see [`./example/example.entry.js`](./example/example.entry.js).

## Concept

gooplate performs text-based substitution by replacing placeholders in a template with corresponding values. It is similar in effect to data binding in React or Vue, but operates purely on plain text. It has no awareness of any particular format — it does not know whether the text is HTML, Markdown, or anything else.

There are five main types of template substitution:

### Expression Substitution

Evaluates an expression and replaces the placeholder with the result.

You may use JS-style variables, literals, operators, and method calls inside expressions. Note that literals and operators have some restrictions — see the Appendix.

```
{{expression}}
```

`{{` is called the **opening delimiter** and `}}` the **closing delimiter**.

The following built-in converter functions are also available inside expressions:

- `range(start, end, step)` — Produces an incrementing or decrementing generator from `start` (inclusive) up to `end` (exclusive) with a step of `step`.
- `stepper(start, step)` — Produces an incrementing or decrementing stepper; call `s.next()` to advance to the next value and `s.value` to read the current value.

For non-integer output, be aware that results are floating-point numbers. It is recommended to format them with `toFixed(n)` when rendering.

### Assignment

Creates a new variable and assigns it the value of the expression. Assignment produces no output but the variable can be used in subsequent substitutions.

```
{{varname = expression}}
```

### Conditional Substitution

Renders output conditionally. `elseif` and `else` are optional; multiple `elseif` branches are allowed.

1. `{{if condition1}} output1 {{endif}}`
2. `{{if condition1}} output1 {{else}} other output {{endif}}`
3. `{{if condition1}} output1 {{elseif condition2}} output2 {{else}} other output {{endif}}`

### Loop Substitution

- `{{for value in object}} content: {{value}} {{endfor}}`  
  Iterates over all own property **values** of `object` (not keys).
- `{{for key, value in object}} key: {{key}}, value: {{value}} {{endfor}}`  
  Iterates over both keys and values. When `object` is an Array, keys are numeric indices.

### Comments

Inside any template expression, `// comment text` can be used for comments. Everything between `//` and the closing delimiter `}}` is treated as a comment and produces no output.

## Extended Delimiters

Beyond the standard `{{` and `}}` delimiters, a set of extended delimiters can affect the whitespace or newlines **outside** the delimiters themselves.

These are primarily intended to help keep templates visually readable. See `example/example.js` for usage examples.

In the examples below, assume the variable `code` has the value `@`.

### Left Whitespace Trimming

For convenience, `{{_` strips whitespace (spaces and tabs) to the left of the opening delimiter, but not newlines. That whitespace is not written to the output.

- `A 	  {{_code}}` outputs→ `A@`.

### Left Line-merging

To also strip blank lines, use the `_{{` variant. It merges the first non-blank line above with the content after `{{` on the current line.

The detailed behaviour is:

- It walks back to the nearest non-blank line above, stripping the newline at the end of that line and all whitespace between that newline and the `_{{`. Trailing whitespace on the non-blank line itself is preserved.
- When there is no newline to the left of `_{{`, or when there are non-whitespace characters between the first newline to the left and `_{{`, the `_` falls back to literal character output instead of being treated as a whitespace-trimming marker.

- `A 
 	   _{{code}}` outputs→ `A @`
- `A  	   _{{code}}` outputs→ `A  	   _@`

Note: when both sides carry a `_` as in `_{{_code}}`, only `{{_` takes effect. See §Ambiguity and Escaping.

### Right Whitespace Trimming

For convenience, `_}}` strips all whitespace to the right of the closing delimiter. That whitespace is not written to the output.

- `{{code_}}  	 A` outputs→ `@A`.

### Right Line-merging

To also strip blank lines, use the `}}_` variant. It merges the content before `}}` on the current line with the first non-blank line below.

The detailed behaviour is:

- It strips all whitespace and newlines after `}}_` up to the next non-blank line. Leading whitespace on that non-blank line is preserved.
- When there is no newline to the right of `}}_`, or when there are non-whitespace characters between `}}_` and the first newline to the right, the `_` falls back to literal character output instead of being treated as a whitespace-trimming marker.

- `{{code}}_
 	   
 A` outputs→ `@ A`
- `{{code}}_  	   A` outputs→ `@_  	   A`

Note: when both sides carry a `_` as in `{{code_}}_`, only `_}}` takes effect. See §Ambiguity and Escaping.

### Example

```
1{{// strip trailing whitespace _}}    This line has its trailing whitespace removed
2{{ }}_        	
    The whitespace before this line trails after line 2 in the output — the newline after the delimiter is removed
3{{ }}_


    This line trails after 3 in the output; the three blank lines above are all removed

    		_{{// appends a period at the end of the previous non-blank line}}。
4    A_{{// these two _ characters are not recognised as extended delimiters}}_B
        {{_ // strip leading whitespace}}Done
```

Final output:

```
1This line has its trailing whitespace removed
2    The whitespace before this line trails after line 2 in the output — the newline after the delimiter is removed
3    This line trails after 3 in the output; the three blank lines above are all removed。
4    A__B
Done
```

### Extended Delimiter Ambiguity and Escaping

- When a `_` must immediately follow a closing delimiter in output, use `_}}_` — the `_}}` terminates the closing delimiter early, and the trailing `_` is written to output normally.
- When a `_` must immediately precede an opening delimiter in output, use `_{{_` — the `{{_` look-ahead prevents `_{{` from being recognised, and the leading `_` is written to output normally.
- When a variable name inside a substitution begins or ends with `_`, leave a space between it and the delimiter to avoid it being interpreted as an extended delimiter. Example: `{{ _var1 + var2_ }}`
- `{{_}}` is illegal — the parser cannot determine whether the `_` belongs to the opening or closing delimiter, and conversion will halt. Add a space inside the delimiters to disambiguate, e.g. `{{_ }}` or `{{ _}}`.

## Appendix

**Literals**

Boolean values, numbers, strings, arrays, and objects.

**Supported Operators**

| Category | Operators |
|---|---|
| Unary | `+` `-` `~` `!` |
| Binary | `in` `+` `-` `*` `/` `%` `==` `===` `!=` `!==` `<` `>` `<=` `>=` |
| Ternary | `?:` |
| Assignment | `=` `+=` `-=` `*=` `**=` `/=` `%=` `??=` |
| Member access | `obj.prop` `obj[prop]` |
| Sequence | `,` |
| Logical | `\|\|` `&&` `??` |
| Spread | `...` |
| Call | `()` |
