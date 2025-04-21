import { convert } from "../src/index.js";

const tags = {
    "tyrants": [{
        "name": "腊肉",
        "ID": 18931226,
        "peoples": [
            { name: 'JQ', age: 68 },
            { name: 'ZCC', age: 61 },
            { name: 'YWY', age: 56 },
            { name: 'WHW', age: 45 },
            { name: 'MJY', age: 38 },
            { name: 'WXJ', age: 38 },
            { name: 'WHR', age: 38 },
            { name: 'ZYF', age: 34 },
            { name: 'XJY', age: 33 },
        ]
    }, {
        "name": "包子",
        "ID": 19530615,
        "peoples": [],
    }]
};

const template = `{{no = 0}}_
{{for tyrant in tyrants}}_
  {{_ }}这是一个关于{{tyrant.name}}的测试

  {{_ }}{{tyrant.name}}的ID: {{tyrant.ID}}
  {{_if tyrant.peoples.length==0}}_
    {{_ }}**手下没人!**
  {{_else}}_
    {{_ }}身边的打手(大于40岁):
    {{_for people in tyrant.peoples}}{{no=no+1}}_
      {{_if people.age > 40 }}_
        {{_ }}* {{no}}:{{people.name}}
      {{_endif // people.age}}_
    {{_endfor}}_
  {{_endif}}

{{endfor}}`

console.log(convert(tags, template));
