import { convert } from "../src/index.js";
import { throws, strictEqual } from "node:assert/strict";
import { suite, test } from 'node:test';
suite('convert(tags, template)', () => {
    suite('Template parsed correctly', () => {
        suite('{{express}} outputs correctly', () => {
            test('{{ variable }} outputs correctly', () => {
                strictEqual( // Test Variables Variables in brackets String containing variables
                    convert({
                        name: "赵六"
                    }, '人物: {{name}} {{(name)}} {{"name"+name // comment}}'),
                    "人物: 赵六 赵六 name赵六"
                );
            });
            test('{{ non-variable }} output undefined', () => {
                strictEqual( // Test is not an identifier of a variable
                    convert({
                        name: "赵六"
                    }, '人物: {{naem}} {{"name"+naem // 变量名称不正确}}'),
                    "人物: undefined nameundefined"
                );
            });
            test('{{ Unary binary operation expression }} outputs correctly', () => {
                strictEqual( // Test binary operations on numbers + - * / %
                    convert(
                        { length: 8, width: 6 },
                        '面积:{{(length+3)*(width-4)/2}} \n空余: {{length % width // comment}}'
                    ),
                    "面积:11 \n空余: 2"
                );
                strictEqual( // Testing boolean binary operations && ||
                    convert(
                        { go: true, car: false, ud: null },
                        '步行外出:{{go && !car}} \n乘车外出: {{go && car}} \n有外出: {{go || car}}\n{{ud ?? "无效值" // comment}}'
                    ),
                    "步行外出:true \n乘车外出: false \n有外出: true\n无效值"
                );
                strictEqual( // Test other binary operations == === != !==
                    convert(
                        {},
                        '{{null == undefined}}:{{null === undefined}}:{{null != undefined}}:{{null !== undefined // comment}}'
                    ),
                    "true:false:false:true"
                );
                strictEqual( // test membership operator . []
                    convert({
                        ID: 1,
                        prop: "ID",
                        conn: {
                            ID: 2,
                            addr: { ID: 3, value: "xian rd. 128" }
                        }
                    }, '{{ID}} {{conn.ID}} {{conn["ID"]}} {{conn[prop]}} {{conn.addr.ID}} {{conn.addr["value"]}}'),
                    "1 2 2 2 3 xian rd. 128"
                );
                strictEqual( // Test chain operator ?.
                    convert({
                        someone: {
                            addr: { ID: 3, value: "xian rd. 128" }
                        }
                    }, '{{someone?.addr?.ID}} {{someone["addr"]?.value}} {{someone["addr"]?.zip}}'),
                    "3 xian rd. 128 undefined"
                );
            });
            test('{{ ternary arithmetic expression }} outputs correctly', () => {
                strictEqual( // Test assignment operations '?:'
                    convert(
                        { n: 1, b: false },
                        '{{n==1?"n=1":""}}\n{{b?"b=true":"b=false"}}'
                    ),
                    "n=1\nb=false"
                );
            });
            test('{{ sequence expression }} outputs correctly', () => {
                strictEqual( // Test sequence operations ','
                    convert(
                        {},
                        '{{a = 1, b =2, a + b}}\n{{h="hello", w="word", h+" "+w}}'
                    ),
                    "3\nhello word"
                );
            });
            test('{{ array literal }} outputs correctly', () => {
                strictEqual( // Test array literal
                    convert(
                        { common: [true, 'test'] },
                        '{{ [1,2,3,"test"][3] }}_{{ [...common][1] }}'
                    ),
                    "test_test"
                );
            });
            test('{{ object literal }} outputs correctly', () => {
                strictEqual( // test object literal
                    convert(
                        { n: 1, has: false, common: { name: 'test' } },
                        '{{ ({n, a: 3, has}).has }}_{{ ({...common}).name }}'
                    ),
                    "false_test"
                );
            });
            test('{{ assignment expression }} outputs correctly', () => {
                // Test assignment operations '=', '+=', '-=', '*=', '/=', '**=', '%=', '??='
                strictEqual( // '=', '+=', '-=', '*=', '/='
                    convert(
                        { b: false },
                        '{{n=1}}{{n}}\n{{n+=2}}{{n}}\n{{n-=3}}{{n}}\n{{n*=4}}{{n}}\n{{n/=5}}{{n}}'
                    ),
                    '1\n3\n0\n0\n0'
                )
                strictEqual( // '**=', '%='
                    convert(
                        { b: false },
                        '{{n=2}}{{n}}\n{{n**=3}}{{n}}\n{{n%=3}}{{n}}\n{{b??=4}}{{b}}\n{{c??=5}}{{c}}'
                    ),
                    '2\n8\n2\nfalse\n5'
                )
                strictEqual( // '&&=', '||=', '??='
                    convert(
                        { a: false, b: true },
                        '{{a&&="a"}}{{a}}\n{{b&&="&&b"}}{{b}}\n{{a||="||a"}}{{a}}\n{{b||="||b"}}{{b}}\n{{a??="??a"}}{{a}}\n{{d??="??d"}}{{d}}'
                    ),
                    'false\n&&b\n||a\n&&b\n||a\n??d'
                )
                strictEqual( // assignment in loop and condition
                    convert(
                        {
                            list: [
                                [1, 2, 3],
                                [7, 8],
                                [4, 5, 6]
                            ]
                        },
                        '{{n=0}}{{if true}}{{n+=1,n}}:nothing\n{{endif}}{{for i in list}}{{for j in i}}{{n+=1,n}}:{{j}}\n{{endfor}}{{endfor}}'
                    ),
                    '1:nothing\n2:1\n3:2\n4:3\n5:7\n6:8\n7:4\n8:5\n9:6\n'
                );
            });
            test('{{ call expression }} outputs correctly', () => {
                strictEqual( // {{ range() }} outputs correctly
                    convert(
                        {},
                        '{{[...range(10)]// array}}\n{{for i in range(1,11)}}{{i}} {{endfor}}\n{{for i in range(10,8,-0.2)}}{{i.toFixed(1)}} {{endfor}}'
                    ),
                    "0,1,2,3,4,5,6,7,8,9\n1 2 3 4 5 6 7 8 9 10 \n10.0 9.8 9.6 9.4 9.2 9.0 8.8 8.6 8.4 8.2 8.0 "
                );
                strictEqual( // {{ stepper() }} outputs correctly
                    convert(
                        {},
                        '{{s = stepper(10,2)}}{{for i in range(1,11)}}{{s.value}} {{s.next()}}{{endfor}}{{s.value}}\n'
                        + '{{s = stepper(0,0.1)}}{{for i in range(0,10)}} {{s.next()}}{{s.value.toFixed(1)}}{{endfor}}'
                    ),
                    "10 12 14 16 18 20 22 24 26 28 30\n 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1.0"
                );
                strictEqual( // Object.valueOf and Object.entries output correctly
                    convert(
                        { myobj: { name: 'myobj', value: 'v' } },
                        '{{myobj.valueOf()}} {{Object.entries(myobj)}}'
                    ),
                    "[object Object] name,myobj,value,v"
                );
                strictEqual( // Array.join The output is correct
                    convert(
                        { mylist: ['apple', 'banana', 'orange', 'pear'] },
                        '{{ mylist.join(" | ") }},{{ mylist["join"](" | ") }}'
                    ),
                    "apple | banana | orange | pear,apple | banana | orange | pear"
                );
                strictEqual( // ...The spread operator output is correct
                    convert(
                        { a: [], b: [1, 2, 3] },
                        '{{a.push(...b)}}\n{{a.join("")}}'
                    ),
                    "3\n123"
                );
                strictEqual( // dustom method outputs correctly
                    convert(
                        {
                            show() {
                                return ['apple', 'banana', 'orange', 'pear'].join(" | ");
                            }
                        },
                        '{{ show() }}'
                    ),
                    "apple | banana | orange | pear"
                );
            });
        });
        suite('{{for}} loop', () => {
            test('for in array', () => {
                strictEqual( // Test array traversal
                    convert(
                        { peoplelist: ["张三", "李四", "王五"] },
                        '以下人员:\n{{for name in peoplelist}}人物: {{name}}\n{{endfor}}'
                    ),
                    "以下人员:\n人物: 张三\n人物: 李四\n人物: 王五\n"
                );
                strictEqual( // Test array traversal with serial number
                    convert(
                        { peoplelist: ["张三", "李四", "王五"] },
                        '{{for sn, name in peoplelist}}人物{{sn+1}}:{{name}}\n{{endfor // sn, name}}'
                    ),
                    '人物1:张三\n人物2:李四\n人物3:王五\n'
                );
            });
            test('for in object', () => {
                strictEqual( // Test object traversal
                    convert(
                        { person: { name: "张三", age: 18, gender: "男" } },
                        '人员:\n{{for prop in person}}{{prop}}\n{{endfor}}'
                    ),
                    "人员:\n张三\n18\n男\n"
                );
                strictEqual( // Test object traversal with key value
                    convert(
                        { person: { name: "张三", age: 18, gender: "男" } },
                        '人员:\n{{for pname, prop in person}}{{pname}}:{{prop}}\n{{endfor}}'
                    ),
                    "人员:\nname:张三\nage:18\ngender:男\n"
                );
            });
            test('whitespace characters in the for expression', () => {
                strictEqual( // There is a carriage return in the expression
                    convert({}, `{{\n   \nfor sn, name\n in ["张三", \n"李四", "王五"]\n}}人物{{sn}}:{{name}}\n{{\nendfor \n//sn, name\n}}`),
                    '人物0:张三\n人物1:李四\n人物2:王五\n'
                );
            });
        });
        suite('{{if}} condition', () => {
            test('if condition', () => {
                strictEqual(
                    convert({}, ' {{if "name".length \n>\n0   }}\n人物: {{"XX"}}{{endif}}'),
                    " \n人物: XX"
                );
                strictEqual(
                    convert({
                        name: "吴七"
                    }, '{{if \nname}}{{name}}{{ endif \n// comment}}'),
                    "吴七"
                );
            });
        });
        suite('other', () => {
            test('// comment', () => {
                strictEqual(
                    convert({}, '{{// let \nr = \n\t5*8/2 }}'),
                    ""
                );
                strictEqual(
                    convert({}, '{{\n \n// begin with blank lines }}'),
                    ""
                );
                strictEqual(
                    convert(
                        { list: [1, 2, 3] },
                        '{{\n \n// comment\nfor i in list//}}{{i}}{{endfor}}'),
                    "123"
                );
            });
            test('Empty replacement {{ }} is not output', () => {
                strictEqual(
                    convert({}, ' {{ }}abc{{\t\n}}test\n'),
                    " abctest\n"
                );
            });
            test('Remove leading blanks — {{_ strips spaces and tabs only', () => {
                strictEqual( // {{_ removes leading spaces and tabs, but not newlines
                    convert({}, '\t \t{{_// comment}}test  {{_ }} \n'),
                    "test \n"
                );
                strictEqual( // there are no spaces or tabs
                    convert({}, 'A{{_// comment}}test'),
                    "Atest"
                );
                strictEqual( // {{_ does not consume a preceding newline
                    convert({}, 'A\n\t {{_// comment}}B'),
                    "A\nB"
                );
            });
            test('Remove leading blanks — _{{ strips empty and whitespace-only lines', () => {
                strictEqual( // _{{ consumes all preceding blank lines
                    convert({}, '\n\t \t_{{// comment}}test'),
                    "test"
                );
                strictEqual( // multiple blank lines before _{{ are all consumed
                    convert({}, 'A \r\n \n\t _{{// comment}}B'),
                    "A B"
                );
                strictEqual( // when there is no blank line before _, _ renders as raw text
                    convert({}, 'A_{{// comment}}B'),
                    "A_B"
                );
                strictEqual( // another case of no blank line
                    convert({}, 'A  _{{// comment}}B'),
                    "A  _B"
                );
                strictEqual( // _{{_ — only {{_ takes effect; leading _ and whitespace are preserved
                    convert({}, '\t \t_{{_// comment}}B'),
                    "\t \t_B"
                );
            });
            test('Remove following blanks — _}} strips spaces and tabs only', () => {
                strictEqual( // _}} removes trailing spaces and tabs, not newlines
                    convert({}, '{{ _}}\t   \r\n_\n_\ntest\n'),
                    "\r\n_\n_\ntest\n"
                );
                strictEqual( // there are no spaces or tabs
                    convert({}, 'A {{ _}}test'),
                    "A test"
                );
                strictEqual( // _}} does not consume a following newline
                    convert({}, 'A{{ _}}\n\t B'),
                    "A\n\t B"
                );
            });
            test('Remove following blanks — }}_ strips empty and whitespace-only lines', () => {
                strictEqual( // }}_ consumes all following blank lines
                    convert({}, '{{// comment}}_  \r\n test\n'),
                    " test\n"
                );
                strictEqual( // }}_ consumes the newline immediately after }}_
                    convert({}, '{{// comment}}_\r\n_\ntest\n'),
                    "_\ntest\n"
                );
                strictEqual( // }}_ consumes multiple consecutive blank lines
                    convert({}, '{{// comment}}_\r\n\n\r\n  _\ntest\n'),
                    "  _\ntest\n"
                );
                strictEqual( // }}_ stops at the first non-blank line
                    convert({}, 'A{{// comment}}_\n B'),
                    "A B"
                );
                strictEqual( // }}_ consumes \r\n followed by blank lines with only whitespace
                    convert({}, 'A{{// comment}}_\r\n \t \n \n\tB'),
                    "A\tB"
                );
                strictEqual( // _}}_: only _}} takes effect; trailing _ and whitespace are preserved
                    convert({}, '{{ _}}_\n\r\n\n A'),
                    "_\n\r\n\n A"
                );
            });
            test('Overlapping blanks — Eliminate the overlapping parts', () => {
                strictEqual( // }}_ _{{
                    convert({}, '{{// comment}}_\r\n\n _{{ _}} \r\n_\ntest\n'),
                    "\r\n_\ntest\n"
                );
                strictEqual( // }}_ {{_
                    convert({}, '{{// comment}}_\r\n\n {{__}} \r\n_\ntest\n'),
                    "\r\n_\ntest\n"
                );
                strictEqual( // _}} _{{
                    convert({}, '{{// comment_}}  \r\n\n _{{}} \r\n_\ntest\n'),
                    " \r\n_\ntest\n"
                );
                strictEqual( // _}} {{_
                    convert({}, '{{// comment_}}\t \t {{_ }} \r\n_\ntest\n'),
                    " \r\n_\ntest\n"
                );
            });
        });
    });
    suite('Template syntax error', () => {
        test('Expression error', () => {
            throws(() => { // Test expression is illegal
                convert({}, '{{a ** b}}');
            }, SyntaxError);
        });
        test('Unsupported syntax used', () => {
            throws(() => {
                convert({}, '{{ a++ }}{{ c <<= d }}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{b = a => a+1}}');
            }, SyntaxError);
        });
        test('if for instruction error', () => {
            throws(() => {
                convert({}, '{{if9>0}}9>0{{endif}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{if 9>0}}9>0{{endif9>0}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{fora in [0,1,2]}}{{a}}{{endfor}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{for no in [0,1,2]}}{{no}}{{endforno}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{if   }}if{{endif}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{for   }}if{{endif}}');
            }, SyntaxError);
        });
        test('for endfor does not match', () => {
            throws(() => {
                convert({}, '{{for name in ["张三", "李四", "王五"]}}人物: {{name}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '以下人员:{{if "赵六" in ["张三", "李四", "王五"]}}\n人物: {{name}}{{endfor}}');
            }, SyntaxError);
        });
        test('if endif does not match', () => {
            throws(() => {
                convert({}, '以下人员:{{if "赵六" in ["张三", "李四", "王五"]}}\n人物: {{name}}');
            }, SyntaxError);
            throws(() => {
                convert({}, '{{for name in ["张三", "李四", "王五"]}}人物: {{name}}{{endif}}');
            }, SyntaxError);
        });
        test('incorrect pairs of {{ }}', () => {
            throws(() => {
                convert({}, 'r11: {{// {{r12}} r13');
            }, SyntaxError);
            throws(() => {
                convert({}, 'r21: {{name r22');
            }, SyntaxError);
            throws(() => {
                convert({}, 'r31 }}{{name}} r32');
            }, SyntaxError);
            throws(() => {
                convert({}, 'r41: {{name}}r42 }} r43');
            }, SyntaxError);
            throws(() => {
                convert({}, 'r51: {{_}} r52');
            }, SyntaxError);
        });
    });
});
